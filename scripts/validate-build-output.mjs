import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const CONTENT_ROOT = path.resolve('content/posts');
const SITE_URL = 'https://life.pagero.kr';

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const pagePath = (post, pageNumber) => pageNumber === 1
  ? `/${post.category}/${post.slug}/`
  : `/${post.category}/${post.slug}/${pageNumber}/`;
const pageFile = (pathname) => path.join(DIST, pathname.replace(/^\//, ''), 'index.html');
const count = (html, pattern) => [...html.matchAll(pattern)].length;
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

function assertSingle(html, pattern, label, pathname) {
  const matches = count(html, pattern);
  if (matches !== 1) throw new Error(`${pathname}: expected one ${label}, found ${matches}`);
}

function internalTarget(href) {
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  const pathname = href.split(/[?#]/, 1)[0];
  if (!pathname) return null;
  return pathname.endsWith('/')
    ? path.join(DIST, pathname.replace(/^\//, ''), 'index.html')
    : path.join(DIST, pathname.replace(/^\//, ''));
}

const requiredOutputs = [
  ['index.html', '<!doctype html>'],
  ['robots.txt', 'Sitemap: https://life.pagero.kr/sitemap.xml'],
  ['sitemap.xml', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'],
  ['sitemap-index.xml', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'],
];

for (const [relativePath, expected] of requiredOutputs) {
  const file = path.join(DIST, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Missing build output: ${relativePath}`);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(expected)) throw new Error(`Invalid build output: ${relativePath}`);
}

if (fs.existsSync(path.join(DIST, 'editorial-policy'))) {
  throw new Error('Removed editorial-policy directory must not be generated');
}

const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const lastmods = [...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((match) => match[1]);

if (urls.length < 10) throw new Error(`Sitemap contains too few URLs: ${urls.length}`);
if (urls.some((url) => !url.startsWith(`${SITE_URL}/`))) throw new Error(`Sitemap contains a URL outside ${SITE_URL}/`);
if (new Set(urls).size !== urls.length) throw new Error('Sitemap contains duplicate URLs');
if (lastmods.length !== urls.length) throw new Error(`Every sitemap URL must have lastmod (${urls.length} URLs, ${lastmods.length} lastmod values)`);
if (urls.some((url) => /\/(2|3)\/$/.test(url))) throw new Error('Continuation pages must not appear in sitemap.xml');
if (sitemap.includes('/editorial-policy/')) throw new Error('Removed editorial-policy URL leaked into sitemap.xml');

const posts = walk(CONTENT_ROOT)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => !post.noindex);

for (const post of posts) {
  const basePath = pagePath(post, 1);
  const baseUrl = `${SITE_URL}${basePath}`;
  const baseFile = pageFile(basePath);
  if (!fs.existsSync(baseFile)) throw new Error(`Missing base article page: ${basePath}`);

  const baseHtml = fs.readFileSync(baseFile, 'utf8');
  const firstImage = post.series?.parts?.[0]?.image;
  const escapedFirstImage = firstImage ? escapeHtml(firstImage) : '';

  assertSingle(baseHtml, /<meta\s+name="robots"[^>]*>/gi, 'robots meta tag', basePath);
  assertSingle(baseHtml, /<link\s+rel="canonical"[^>]*>/gi, 'canonical tag', basePath);

  if (!baseHtml.includes('<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">')) {
    throw new Error(`Base article is not indexable: ${basePath}`);
  }
  if (!baseHtml.includes(`<link rel="canonical" href="${baseUrl}">`)) {
    throw new Error(`Invalid base canonical: ${basePath}`);
  }
  if (firstImage && !baseHtml.includes(`<meta property="og:image" content="${escapedFirstImage}">`)) {
    throw new Error(`Missing article og:image: ${basePath}`);
  }
  if (firstImage && !baseHtml.includes(`<meta name="twitter:image" content="${escapedFirstImage}">`)) {
    throw new Error(`Missing article twitter:image: ${basePath}`);
  }
  if (!baseHtml.includes('"@type":"Article"') || !baseHtml.includes('"image":[')) {
    throw new Error(`Article schema image missing: ${basePath}`);
  }
  if (!baseHtml.includes('"@type":"BreadcrumbList"')) {
    throw new Error(`Breadcrumb schema missing: ${basePath}`);
  }
  if (!baseHtml.includes('"@type":"FAQPage"')) {
    throw new Error(`FAQ schema missing from the complete visible base page: ${basePath}`);
  }
  if (!baseHtml.includes('class="series-full-guide"') || !baseHtml.includes('data-full-guide="true"')) {
    throw new Error(`Complete indexable guide missing from base page: ${basePath}`);
  }

  for (const [index, part] of post.series.parts.entries()) {
    if (!baseHtml.includes(`data-part="${index + 1}"`)) {
      throw new Error(`Base page missing full content part ${index + 1}: ${basePath}`);
    }
    if (!baseHtml.includes(`<h2 class="series-part-title">${escapeHtml(part.title)}</h2>`)) {
      throw new Error(`Base page missing part title "${part.title}": ${basePath}`);
    }
  }

  for (const source of post.sources || []) {
    const sourceLink = `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>`;
    if (!baseHtml.includes(sourceLink)) {
      throw new Error(`Base page missing clickable official source "${source.name}": ${basePath}`);
    }
  }

  if (!urls.includes(baseUrl)) throw new Error(`Indexable article missing from sitemap: ${basePath}`);

  const total = Array.isArray(post.series?.parts) ? post.series.parts.length : 1;
  for (let pageNumber = 2; pageNumber <= total; pageNumber += 1) {
    const continuationPath = pagePath(post, pageNumber);
    const continuationUrl = `${SITE_URL}${continuationPath}`;
    const continuationFile = pageFile(continuationPath);
    if (!fs.existsSync(continuationFile)) throw new Error(`Missing continuation page: ${continuationPath}`);

    const html = fs.readFileSync(continuationFile, 'utf8');
    assertSingle(html, /<meta\s+name="robots"[^>]*>/gi, 'robots meta tag', continuationPath);
    assertSingle(html, /<link\s+rel="canonical"[^>]*>/gi, 'canonical tag', continuationPath);

    if (!html.includes('<meta name="robots" content="noindex,follow,max-image-preview:large,max-snippet:-1">')) {
      throw new Error(`Continuation page must be noindex,follow: ${continuationPath}`);
    }
    if (!html.includes(`<link rel="canonical" href="${continuationUrl}">`)) {
      throw new Error(`Continuation page must use a self-canonical URL: ${continuationPath}`);
    }
    if (html.includes('"@type":"Article"') || html.includes('"@type":"FAQPage"') || html.includes('"@type":"BreadcrumbList"')) {
      throw new Error(`Continuation page contains duplicate article-level structured data: ${continuationPath}`);
    }
    if (urls.includes(continuationUrl)) throw new Error(`Continuation page leaked into sitemap: ${continuationPath}`);
    if (html.includes('series-progress') || html.includes('series-kicker') || /[>\s][123]\s*단계(?:\s|<|·)/.test(html)) {
      throw new Error(`Visible progress-stage UI leaked into ${continuationPath}`);
    }

    const part = post.series?.parts?.[pageNumber - 1];
    if (part?.image && !html.includes(`<img src="${escapeHtml(part.image)}"`)) {
      throw new Error(`Continuation image missing: ${continuationPath}`);
    }
  }
}

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = `/${path.relative(DIST, file).replaceAll(path.sep, '/')}`;
  assertSingle(html, /<meta\s+name="robots"[^>]*>/gi, 'robots meta tag', relative);
  assertSingle(html, /<link\s+rel="canonical"[^>]*>/gi, 'canonical tag', relative);

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) continue;
    if (href === '/editorial-policy/' || href.startsWith('/editorial-policy/?') || href.startsWith('/editorial-policy/#')) {
      throw new Error(`${relative}: removed editorial-policy link remains`);
    }
    const target = internalTarget(href);
    if (target && !fs.existsSync(target)) throw new Error(`${relative}: broken internal href ${href}`);
  }

  for (const match of html.matchAll(/src="([^"]+)"/g)) {
    const src = match[1];
    const target = internalTarget(src);
    if (target && !fs.existsSync(target)) throw new Error(`${relative}: broken internal src ${src}`);
  }
}

console.log(`Build output validated: ${urls.length} sitemap URL(s), ${posts.length} complete base guides, ${htmlFiles.length} HTML file(s), no duplicate SEO tags, progress UI, editorial-policy output, or broken internal links.`);
