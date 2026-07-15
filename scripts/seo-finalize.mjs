import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content', 'posts');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://life.pagero.kr').replace(/\/$/, '');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const canonicalUrl = (pathname) => `${SITE_URL}${pathname}`;
const pagePath = (post, pageNumber) => pageNumber === 1
  ? `/${post.category}/${post.slug}/`
  : `/${post.category}/${post.slug}/${pageNumber}/`;
const pageFile = (pathname) => path.join(DIST, pathname.replace(/^\//, ''), 'index.html');

function replaceSingleMeta(html, attribute, key, tag) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${attribute}="${escapedKey}"[^>]*>`, 'gi');
  return html.replace(pattern, '').replace('</head>', `${tag}</head>`);
}

function replaceSingleCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}">`;
  return html.replace(/<link\s+rel="canonical"[^>]*>/gi, '').replace('</head>', `${tag}</head>`);
}

function rewriteStructuredData(html, { indexable, image }) {
  let hasBreadcrumb = false;
  let hasFaq = false;
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return full; }
    const type = data?.['@type'];

    if (!indexable && ['Article', 'FAQPage', 'BreadcrumbList'].includes(type)) return '';
    if (type === 'Article') {
      data.image = [image];
      return `<script type="application/ld+json">${safeJson(data)}</script>`;
    }
    if (type === 'BreadcrumbList') hasBreadcrumb = true;
    if (type === 'FAQPage') hasFaq = true;
    return full;
  });
  return { html, hasBreadcrumb, hasFaq };
}

function finalizePage({ post, pageNumber, indexable }) {
  const pathname = pagePath(post, pageNumber);
  const file = pageFile(pathname);
  if (!fs.existsSync(file)) throw new Error(`Missing generated article page: ${pathname}`);

  const part = post.series?.parts?.[pageNumber - 1] || post.series?.parts?.[0] || {};
  const image = part.image || post.series?.parts?.[0]?.image || `${SITE_URL}/og-default.svg`;
  const imageAlt = part.imageAlt || post.title;
  const selfUrl = canonicalUrl(pathname);

  let html = fs.readFileSync(file, 'utf8');
  html = replaceSingleCanonical(html, selfUrl);
  html = replaceSingleMeta(html, 'name', 'robots', `<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large,max-snippet:-1' : 'noindex,follow,max-image-preview:large,max-snippet:-1'}">`);
  html = replaceSingleMeta(html, 'property', 'og:image', `<meta property="og:image" content="${escapeHtml(image)}">`);
  html = replaceSingleMeta(html, 'property', 'og:image:alt', `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}">`);
  html = replaceSingleMeta(html, 'name', 'twitter:card', '<meta name="twitter:card" content="summary_large_image">');
  html = replaceSingleMeta(html, 'name', 'twitter:image', `<meta name="twitter:image" content="${escapeHtml(image)}">`);
  html = replaceSingleMeta(html, 'name', 'twitter:image:alt', `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">`);

  const structured = rewriteStructuredData(html, { indexable, image });
  html = structured.html;

  if (indexable && !structured.hasBreadcrumb) {
    const categoryName = post.category === 'car' ? '자동차 생활행정' : '정부지원·생활정책';
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: categoryName, item: `${SITE_URL}/${post.category}/` },
        { '@type': 'ListItem', position: 3, name: post.title, item: selfUrl },
      ],
    };
    html = html.replace('</head>', `<script type="application/ld+json">${safeJson(breadcrumb)}</script></head>`);
  }

  if (indexable && !structured.hasFaq) {
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (post.faqs || []).map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    };
    html = html.replace('</head>', `<script type="application/ld+json">${safeJson(faq)}</script></head>`);
  }

  fs.writeFileSync(file, html);
}

const posts = walk(CONTENT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => !post.noindex)
  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));

for (const post of posts) {
  finalizePage({ post, pageNumber: 1, indexable: true });
  const total = Array.isArray(post.series?.parts) ? post.series.parts.length : 1;
  for (let pageNumber = 2; pageNumber <= total; pageNumber += 1) {
    finalizePage({ post, pageNumber, indexable: false });
  }
}

const latestDate = posts.reduce((latest, post) => {
  const date = post.updatedAt || post.reviewedAt || post.publishedAt || latest;
  return date > latest ? date : latest;
}, '2026-07-13');
const staticPaths = ['/', '/car/', '/support/', '/about/', '/privacy-policy/', '/contact/'];
const entries = staticPaths
  .filter((pathname) => fs.existsSync(pageFile(pathname)))
  .map((pathname) => ({ pathname, lastmod: latestDate }));
for (const post of posts) {
  entries.push({ pathname: pagePath(post, 1), lastmod: post.updatedAt || post.reviewedAt || post.publishedAt });
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(({ pathname, lastmod }) => `  <url><loc>${escapeHtml(canonicalUrl(pathname))}</loc><lastmod>${escapeHtml(lastmod)}</lastmod></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);

const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE_URL}/sitemap.xml</loc><lastmod>${latestDate}</lastmod></sitemap>\n</sitemapindex>\n`;
fs.writeFileSync(path.join(DIST, 'sitemap-index.xml'), sitemapIndex);

console.log(`SEO finalized: ${posts.length} indexable article(s), ${entries.length} sitemap URL(s); complete base pages retain FAQ schema and continuations remain clean self-canonical noindex pages.`);
