import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const editorialDir = path.join(dist, 'editorial-policy');
const editorialLink = '<a href="/editorial-policy/">편집 원칙</a>';

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
  content = content.replaceAll(editorialLink, '');
  content = content.replaceAll('<li></li>', '');
  content = content.replaceAll('<url><loc>https://life.pagero.kr/editorial-policy/</loc></url>', '');
  content = content.replaceAll('- [편집 원칙](https://life.pagero.kr/editorial-policy/)\n', '');
  fs.writeFileSync(file, content);
}

console.log('Removed public editorial policy page and links.');
