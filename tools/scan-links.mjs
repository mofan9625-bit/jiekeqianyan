import fs from 'fs';
import path from 'path';

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

const allFiles = walk('.');
console.log(`Checking ${allFiles.length} files across the workspace...`);

const affUrls = new Set();
const affMatches = [];

for (const f of allFiles) {
  if (f.replace(/\\/g, '/').startsWith('tools/')) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // regex for url with aff or code=
    const match = line.match(/https?:\/\/[^\s"'<>\)]+(?:aff|code=)[^\s"'<>\)]*/gi);
    if (match) {
      match.forEach(url => {
        affUrls.add(url);
        affMatches.push({ file: f, line: idx + 1, url, text: line.trim() });
      });
    }
  });
}

console.log(`\nFound ${affMatches.length} AFF link occurrences across ${affUrls.size} unique URLs:\n`);
for (const u of affUrls) {
  console.log(`URL: ${u}`);
  const occ = affMatches.filter(m => m.url === u);
  console.log(`  Count: ${occ.length}`);
  occ.forEach(o => {
    console.log(`    - ${o.file}:${o.line}`);
  });
}
