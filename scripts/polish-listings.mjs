import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content', 'posts');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const esc = (value = '') => String(value).replace(/[&<>"']/g, (ch) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));

const posts = walk(CONTENT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => !post.noindex && post.series?.parts?.[0]?.image);

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const post of posts) {
    const href = `/${post.category}/${post.slug}/`;
    const image = post.series.parts[0].image;
    const alt = post.series.parts[0].imageAlt || post.title;
    const hrefEscaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`<a class="post-thumb(?: [^"]*)?" href="${hrefEscaped}">[\\s\\S]*?<\\/a>`, 'g');
    const replacement = `<a class="post-thumb has-image" href="${href}"><img src="${esc(image)}" alt="${esc(alt)}" width="520" height="292" loading="lazy" decoding="async"></a>`;
    const next = html.replace(pattern, replacement);
    if (next !== html) {
      html = next;
      changed = true;
    }
  }

  if (changed && !html.includes('/listing-images.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/listing-images.css"></head>');
  }
  if (changed) fs.writeFileSync(file, html);
}

console.log(`Applied article images to listing cards for ${posts.length} post(s).`);
