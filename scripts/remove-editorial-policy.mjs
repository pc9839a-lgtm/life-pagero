import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const editorialDir = path.join(dist, 'editorial-policy');

fs.rmSync(editorialDir, { recursive: true, force: true });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(dist)) {
  if (!/\.(html|xml|txt)$/.test(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<a\b[^>]*href=["']\/editorial-policy\/["'][^>]*>[\s\S]*?<\/a>/gi, '');
  content = content.replace(/<li>\s*<\/li>/gi, '');
  content = content.replace(/<url>\s*<loc>https:\/\/life\.pagero\.kr\/editorial-policy\/<\/loc>[\s\S]*?<\/url>/gi, '');
  content = content.replace(/^- \[편집 원칙\]\(https:\/\/life\.pagero\.kr\/editorial-policy\/\)\s*$/gm, '');
  fs.writeFileSync(file, content);
}

console.log('Removed public editorial policy page and all clickable links.');
