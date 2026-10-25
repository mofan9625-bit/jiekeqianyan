import fs from 'fs';
import path from 'path';

const AFF_MAP = [
  {
    id: 'yunjiexian',
    name: '云界线',
    url: 'https://9625mofan01.yunjiexianaff.com/#/?code=OOYhSj0L'
  },
  {
    id: 'dalaoyun',
    name: '大佬云',
    url: 'https://mofanvip01.dalaoyunaff.com/#/?code=QT2rqp5V'
  },
  {
    id: 'huanqiuti',
    name: '环球梯',
    url: 'https://mofanvip01.huanqiutiaff.com/#/?code=l7oLmjVU'
  },
  {
    id: 'liulianyun',
    name: '榴莲云',
    url: 'https://mofan88.liulianyunaff.com/#/?code=ETsQBSuR'
  },
  {
    id: 'shandianshu',
    name: '闪电鼠',
    url: 'https://mofanvip01.shandianshuaff.com/#/?code=a3GAQAXg'
  },
  {
    id: 'shenxing',
    name: '神行加速',
    url: 'https://vipmofan01.shenxingaff.com/#/?code=nn4ohwnK'
  }
];

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    if (['node_modules', '.git', 'public', '.agents', '.gemini', 'db.json'].includes(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

let totalReplacements = 0;
const report = [];

const allFiles = walk('.');

for (const file of allFiles) {
  const normFile = file.replace(/\\/g, '/');
  // Skip scanning/replacing tools themselves except build-pillar-benchmark.mjs
  if (normFile.startsWith('tools/') && normFile !== 'tools/build-pillar-benchmark.mjs') continue;
  // Skip _redirects, nginx-redirects.conf, source/go.html, source/_redirects, source/nginx-redirects.conf
  if (normFile.includes('redirects') || normFile.endsWith('go.html')) continue;

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fileReplacements = 0;

  for (const item of AFF_MAP) {
    const rawUrl = item.url;
    const goUrl = `/go.html?id=${item.id}`;

    // 1. Check if rawUrl exists in content
    if (content.includes(rawUrl)) {
      // 1.1 Replace Markdown links [text](rawUrl) with <a href="/go.html?id=xxx" target="_blank" rel="nofollow sponsored noopener noreferrer">text</a>
      // escape regex for rawUrl
      const escapedUrl = rawUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mdRegex = new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, 'g');
      content = content.replace(mdRegex, (match, text) => {
        fileReplacements++;
        return `<a href="${goUrl}" target="_blank" rel="nofollow sponsored noopener noreferrer">${text}</a>`;
      });

      // 1.2 Replace HTML <a href="rawUrl" ...> or variations
      // We match <a ... href="rawUrl" ...> or <a ... href='rawUrl' ...>
      const aTagRegex = new RegExp(`<a\\s+([^>]*?)href=["']${escapedUrl}["']([^>]*?)>`, 'gi');
      content = content.replace(aTagRegex, (match, prefix, suffix) => {
        fileReplacements++;
        let attrs = (prefix + ' ' + suffix).trim();
        // remove existing href, target, rel
        attrs = attrs.replace(/href=["'][^"']*["']/gi, '');
        attrs = attrs.replace(/target=["'][^"']*["']/gi, '');
        attrs = attrs.replace(/rel=["'][^"']*["']/gi, '');
        // clean up extra whitespace
        attrs = attrs.replace(/\s+/g, ' ').trim();
        const extra = attrs.length > 0 ? ' ' + attrs : '';
        return `<a href="${goUrl}" target="_blank" rel="nofollow sponsored noopener noreferrer"${extra}>`;
      });

      // 1.3 If any rawUrl remains (e.g. in JS config officialUrl: 'rawUrl')
      if (content.includes(rawUrl)) {
        const simpleRegex = new RegExp(escapedUrl, 'g');
        content = content.replace(simpleRegex, () => {
          fileReplacements++;
          return goUrl;
        });
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplacements += fileReplacements;
    report.push({ file: normFile, count: fileReplacements });
  }
}

console.log('=== AFF Replacement Report ===');
console.log(`Total replacements made: ${totalReplacements}`);
console.log(`Files modified (${report.length}):`);
report.forEach(r => {
  console.log(` - ${r.file}: ${r.count} replacements`);
});
