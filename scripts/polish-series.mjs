import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content', 'posts');

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (ch) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));
const escapeAttr = escapeHtml;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const pagePath = (post, pageNumber) => pageNumber === 1
  ? `/${post.category}/${post.slug}/`
  : `/${post.category}/${post.slug}/${pageNumber}/`;

const posts = walk(CONTENT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => Array.isArray(post.series?.parts) && post.series.parts.length === 3);

for (const post of posts) {
  post.series.parts.forEach((part, index) => {
    const pageNumber = index + 1;
    const pathname = pagePath(post, pageNumber);
    const file = path.join(DIST, pathname.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(file)) return;

    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/<nav class="series-progress"[\s\S]*?<\/nav>/, '');
    html = html.replace(/<span class="series-kicker">[\s\S]*?<\/span>/, '');
    html = html.replaceAll(`${pageNumber}단계 · `, '');
    html = html.replaceAll('이번 단계 핵심 요약', '핵심 내용');
    html = html.replaceAll('이전 단계', '이전 내용');

    const heading = `<h2 class="series-part-title">${escapeHtml(part.title)}</h2>`;
    const photo = part.image
      ? `<figure class="series-photo"><img src="${escapeAttr(part.image)}" alt="${escapeAttr(part.imageAlt || part.title)}" width="1400" height="788" ${pageNumber === 1 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"></figure>`
      : '';

    html = html.replace('</header><div class="article-content">', `</header>${photo}<div class="article-content">${heading}`);

    const title = pageNumber === 1
      ? `${post.title} | 생활비서`
      : `${part.title} | ${post.title} | 생활비서`;
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(title)}">`);

    if (part.image) {
      const image = escapeAttr(part.image);
      html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`);
      if (html.includes('<meta name="twitter:image"')) {
        html = html.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`);
      } else {
        html = html.replace('<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${image}">`);
      }
      html = html.replace(/(<script type="application\/ld\+json">\{[^<]*"@type":"Article"[^<]*)(<\/script>)/, (match, jsonOpen) => {
        try {
          const raw = jsonOpen.replace(/^<script type="application\/ld\+json">/, '');
          const data = JSON.parse(raw);
          data.image = part.image;
          return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
        } catch {
          return match;
        }
      });
    }

    fs.writeFileSync(file, html);
  });
}

console.log(`Polished ${posts.length} paginated article series.`);
