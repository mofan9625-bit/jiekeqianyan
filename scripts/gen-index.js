const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();

// 可能的文章目录候选列表
const CANDIDATE_DIRS = [
  path.join(ROOT_DIR, 'source', '_posts'),
  path.join(ROOT_DIR, 'source', 'posts'),
  path.join(ROOT_DIR, 'src', 'content'),
  path.join(ROOT_DIR, 'src', 'pages'),
  path.join(ROOT_DIR, 'content', 'posts')
];

// 扫描所有 .md / .mdx 文件
function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getMarkdownFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

// 简单健壮的 YAML Frontmatter 解析器
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yamlStr = match[1];
  const lines = yamlStr.split(/\r?\n/);
  const data = {};
  let currentKey = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      let val = kvMatch[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      data[currentKey] = val;
    } else if (trimmed.startsWith('- ') && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = data[currentKey] ? [data[currentKey]] : [];
      }
      let itemVal = trimmed.replace(/^- /, '').trim();
      if ((itemVal.startsWith('"') && itemVal.endsWith('"')) || (itemVal.startsWith("'") && itemVal.endsWith("'"))) {
        itemVal = itemVal.slice(1, -1);
      }
      data[currentKey].push(itemVal);
    }
  }

  return data;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(rawDate) {
  if (!rawDate) return '1970-01-01';
  if (typeof rawDate === 'string') {
    const match = rawDate.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (match) return match[1].replace(/\//g, '-');
  }
  const d = new Date(rawDate);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '1970-01-01';
}

function main() {
  console.log('🔍 开始扫描全站文章目录...');
  const allFiles = [];
  const scannedDirs = [];

  for (const dir of CANDIDATE_DIRS) {
    if (fs.existsSync(dir)) {
      scannedDirs.push(path.relative(ROOT_DIR, dir));
      const files = getMarkdownFiles(dir);
      allFiles.push(...files);
    }
  }

  console.log(`📂 已扫描目录: ${scannedDirs.join(', ')}`);
  console.log(`📄 共发现文章文件: ${allFiles.length} 篇`);

  const articles = [];

  for (const filePath of allFiles) {
    const relativeFilePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const fileBase = path.basename(filePath);
    const slug = fileBase.replace(/\.(md|mdx)$/, '');
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);

    const title = fm.title || slug;
    const dateStr = formatDate(fm.date || fm.pubDate);

    // 提取 tags / keywords
    let keywords = [];
    if (fm.tags) {
      if (Array.isArray(fm.tags)) keywords.push(...fm.tags);
      else keywords.push(fm.tags);
    }
    if (fm.keywords) {
      if (Array.isArray(fm.keywords)) keywords.push(...fm.keywords);
      else keywords.push(...fm.keywords.split(',').map(s => s.trim()));
    }
    keywords = [...new Set(keywords)].filter(Boolean);

    // 计算站点相对访问路径 (URL)
    // 根据 Hexo 标准 permalink :year/:month/:day/:title/
    const dateParts = dateStr.split('-');
    const year = dateParts[0];
    const month = dateParts[1] || '01';
    const day = dateParts[2] || '01';
    const url = `/${year}/${month}/${day}/${slug}/`;

    articles.push({
      title,
      date: dateStr,
      url,
      relativeFilePath,
      keywords: keywords.join(', ') || '未设置'
    });
  }

  // 按发布日期倒序排序
  articles.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

  // 构建 CONTENT_INDEX.md 内容
  let output = `# 📚 全站文章索引库 (CONTENT_INDEX.md)\n\n`;
  output += `> 本索引库由脚本 \`scripts/gen-index.js\` 自动生成，收录全站所有文章的标题、访问路径、发布日期及核心关键词。\n`;
  output += `> **更新时间**：${new Date().toISOString().replace('T', ' ').slice(0, 19)} (UTC) | **文章总数**：${articles.length} 篇\n\n`;
  output += `## 📋 文章单行索引列表（按日期倒序）\n\n`;

  for (const item of articles) {
    output += `- **${item.date}** | [${item.title}](${item.url}) | 关键词: \`${item.keywords}\` | 源码: \`${item.relativeFilePath}\`\n`;
  }

  output += `\n---\n*提示：撰写新文章或配置内链闭环时，请参照本索引执行查重与互相引流。*\n`;

  const outputPath = path.join(ROOT_DIR, 'CONTENT_INDEX.md');
  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`✅ 已成功生成全站文章索引: ${outputPath}`);
}

main();

