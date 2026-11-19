import fs from 'fs';
import path from 'path';

const postsDir = path.join(process.cwd(), 'source', '_posts');

// 35 篇文章到四大支柱分类的精准映射字典
const CATEGORY_MAP = {
  // --- 1. 专线网络与深度测评 (15 篇) ---
  'what-is-airport-guide-2026.md': '专线网络与深度测评',
  '2026-airport-recommendation.md': '专线网络与深度测评',
  '2026-ai-productivity-nodes-benchmark.md': '专线网络与深度测评',
  'iplc-iepl-vs-direct.md': '专线网络与深度测评',
  'airport-scam-red-black-list.md': '专线网络与深度测评',
  'cross-border-network-acceleration-vpn-guide.md': '专线网络与深度测评',
  'hysteria2-tuic-protocol-explained.md': '专线网络与深度测评',
  'next-gen-proxy-protocols-deep-dive-2026.md': '专线网络与深度测评',
  'yunjiexian-review-2026.md': '专线网络与深度测评',
  'dalaoyun-review-2026.md': '专线网络与深度测评',
  'huanqiuti-review-2026.md': '专线网络与深度测评',
  'liulianyun-review-2026.md': '专线网络与深度测评',
  'shandianshu-review-2026.md': '专线网络与深度测评',
  'shenxing-review-2026.md': '专线网络与深度测评',
  'node-timeout-troubleshooting.md': '专线网络与深度测评',

  // --- 2. 客户端与全场景配置 (5 篇) ---
  'client-configuration-guide.md': '客户端与全场景配置',
  'rule-vs-global-mode-guide.md': '客户端与全场景配置',
  'apple-tv-android-tv-proxy-4k-guide.md': '客户端与全场景配置',
  'openwrt-istoreos-clash-transparent-proxy-guide.md': '客户端与全场景配置',
  'wsl2-docker-git-terminal-proxy-guide.md': '客户端与全场景配置',

  // --- 3. AI生产力与防封实战 (8 篇) ---
  '2026-ai-developer-network-anti-ban-guide.md': 'AI生产力与防封实战',
  'clean-native-ip-setup.md': 'AI生产力与防封实战',
  'chatgpt-ai-red-black-list.md': 'AI生产力与防封实战',
  'ai-tools-red-black-list-vol2.md': 'AI生产力与防封实战',
  'chatgpt-vs-claude-vs-doubao.md': 'AI生产力与防封实战',
  'ai-hallucination-prompt-hacks.md': 'AI生产力与防封实战',
  'excel-data-analysis-ai-guide.md': 'AI生产力与防封实战',
  'ai-ppt-tools-recommendation.md': 'AI生产力与防封实战',

  // --- 4. 跨境出海与站长安全 (7 篇) ---
  'shopify-cross-border-guide.md': '跨境出海与站长安全',
  'klaviyo-email-cart-abandonment.md': '跨境出海与站长安全',
  'tiktok-meta-ads-guide.md': '跨境出海与站长安全',
  'apollo-email-marketing-b2b.md': '跨境出海与站长安全',
  'cloudflare-firewall-cc-403-guide.md': '跨境出海与站长安全',
  'website-malware-removal-guide.md': '跨境出海与站长安全',
  'bing-google-seo-console-submit.md': '跨境出海与站长安全'
};

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
console.log(`🚀 开始对全站 ${files.length} 篇文章执行分类收敛重构...`);

let updatedCount = 0;

for (const file of files) {
  const targetCategory = CATEGORY_MAP[file];
  if (!targetCategory) {
    console.warn(`⚠️ 警告: 文章 ${file} 未在分类映射表中，请核查！`);
    continue;
  }

  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 匹配 frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) continue;

  let fm = fmMatch[1];

  // 清除原有的 category 和 categories 声明块
  // 1. 删除 category: xxx
  fm = fm.replace(/^category:\s*.*$/gm, '');
  // 2. 删除 categories:\n  - xxx\n  - yyy 等整个列表块
  fm = fm.replace(/^categories:\s*\r?\n(\s*-[^\r\n]*\r?\n)*/gm, '');

  // 整理多余空行
  fm = fm.split(/\r?\n/).filter(line => line.trim().length > 0).join('\n');

  // 追加干净统一的单级 categories 块
  fm += `\ncategories:\n  - ${targetCategory}\n`;

  const newContent = `---\n${fm}\n---` + content.slice(fmMatch[0].length);
  fs.writeFileSync(filePath, newContent, 'utf8');
  updatedCount++;
  console.log(`  ✓ [${targetCategory}] ${file}`);
}

console.log(`\n🎉 成功重构 ${updatedCount} 篇文章的分类！`);
