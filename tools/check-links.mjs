import fs from 'fs';
import path from 'path';

// Valid go IDs
const VALID_GO_IDS = new Set([
  'yunjiexian',
  'dalaoyun',
  'huanqiuti',
  'liulianyun',
  'shandianshu',
  'shenxing'
]);

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (item.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const htmlFiles = walk('public');
console.log(`Checking ${htmlFiles.length} generated HTML files for link integrity...`);

let totalGoLinks = 0;
let invalidGoLinks = 0;
let missingRelLinks = 0;
const deadInternalLinks = [];

const aTagRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;

for (const f of htmlFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = aTagRegex.exec(content)) !== null) {
    const prefix = match[1];
    const href = match[2];
    const suffix = match[3];
    const fullTag = match[0];
    const attrs = `${prefix} ${suffix}`;

    // 1. Check /go.html links
    if (href.startsWith('/go.html')) {
      totalGoLinks++;
      const idMatch = href.match(/[?&]id=([a-zA-Z0-9_\-]+)/i);
      if (!idMatch || !VALID_GO_IDS.has(idMatch[1].toLowerCase())) {
        console.error(`[INVALID GO ID] in ${f}: ${href}`);
        invalidGoLinks++;
      }
      
      // Check rel attribute
      if (!attrs.includes('nofollow') || !attrs.includes('sponsored') || !attrs.includes('noopener') || !attrs.includes('noreferrer')) {
        console.error(`[MISSING REL] in ${f}: ${fullTag}`);
        missingRelLinks++;
      }
    }

    // 2. Check internal relative links (e.g. /2026/10/..., /archives/, /about/)
    if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/go.html') && !href.startsWith('/go/')) {
      let decodedPath = '';
      try {
        decodedPath = decodeURIComponent(href.split('?')[0].split('#')[0]);
      } catch (e) {
        decodedPath = href.split('?')[0].split('#')[0];
      }

      if (decodedPath.length > 0 && decodedPath !== '/') {
        // Strip leading slash
        const rel = decodedPath.replace(/^\//, '');
        let targetPath;
        if (rel.endsWith('/')) {
          targetPath = path.join('public', rel, 'index.html');
        } else if (path.extname(rel)) {
          targetPath = path.join('public', rel);
        } else {
          targetPath = path.join('public', rel + '.html');
          if (!fs.existsSync(targetPath)) {
            targetPath = path.join('public', rel, 'index.html');
          }
        }
        
        if (!fs.existsSync(targetPath)) {
          deadInternalLinks.push({ file: f, href, decodedPath, targetPath });
        }
      }
    }
  }
}

console.log('\n=== Link Integrity Audit Results ===');
console.log(`Total /go.html links scanned across site: ${totalGoLinks}`);
console.log(`Invalid /go.html ID count: ${invalidGoLinks}`);
console.log(`Missing rel compliance count: ${missingRelLinks}`);
console.log(`Internal dead links count: ${deadInternalLinks.length}`);

if (deadInternalLinks.length > 0) {
  console.log('\nDead internal links details (first 10):');
  deadInternalLinks.slice(0, 10).forEach(d => {
    console.log(` - Source: ${d.file} -> Href: ${d.href} (Looked for: ${d.targetPath})`);
  });
} else {
  console.log('✅ All internal links and /go.html redirects are completely valid. Zero dead links!');
}
