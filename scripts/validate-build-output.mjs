import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const contentRoot = path.resolve('content/posts');
const siteUrl = 'https://life.pagero.kr';

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const pagePath = (post, pageNumber) => pageNumber === 1
  ? `/${post.category}/${post.slug}/`
  : `/${post.category}/${post.slug}/${pageNumber}/`;
const pageFile = (pathname) => path.join(dist, pathname.replace(/^\//, ''), 'index.html');

const checks = [
  ['index.html', '<!doctype html>'],
  ['robots.txt', 'Sitemap: https://life.pagero.kr/sitemap.xml'],
  ['sitemap.xml', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'],
  ['sitemap-index.xml', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'],
];

for (const [relativePath, expected] of checks) {
  const file = path.join(dist, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Missing build output: ${relativePath}`);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(expected)) throw new Error(`Invalid build output: ${relativePath}`);
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const lastmods = [...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((match) => match[1]);
if (urls.length < 10) throw new Error(`Sitemap contains too few URLs: ${urls.length}`);
if (urls.some((url) => !url.startsWith(`${siteUrl}/`))) throw new Error(`Sitemap contains a URL outside ${siteUrl}/`);
if (new Set(urls).size !== urls.length) throw new Error('Sitemap contains duplicate URLs');
if (lastmods.length !== urls.length) throw new Error(`Every sitemap URL must have lastmod (${urls.length} URLs, ${lastmods.length} lastmod values)`);
if (urls.some((url) => /\/(2|3)\/$/.test(url))) throw new Error('Paginated continuation pages must not appear in sitemap.xml');

const posts = walk(contentRoot)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
  .filter((post) => !post.noindex);

for (const post of posts) {
  const basePath = pagePath(post, 1);
  const baseUrl = `${siteUrl}${basePath}`;
  const baseFile = pageFile(basePath);
  if (!fs.existsSync(baseFile)) throw new Error(`Missing base article page: ${basePath}`);

  const baseHtml = fs.readFileSync(baseFile, 'utf8');
  const firstImage = post.series?.parts?.[0]?.image;
  if (!baseHtml.includes('<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">')) {
    throw new Error(`Base article is not indexable: ${basePath}`);
  }
  if (!baseHtml.includes(`<link rel="canonical" href="${baseUrl}">`)) throw new Error(`Invalid base canonical: ${basePath}`);
  if (firstImage && !baseHtml.includes(`<meta property="og:image" content="${firstImage}">`)) throw new Error(`Missing article og:image: ${basePath}`);
  if (firstImage && !baseHtml.includes(`<meta name="twitter:image" content="${firstImage}">`)) throw new Error(`Missing article twitter:image: ${basePath}`);
  if (!baseHtml.includes('"@type":"Article"') || !baseHtml.includes('"image":[')) throw new Error(`Article schema image missing: ${basePath}`);
  if (!baseHtml.includes('"@type":"BreadcrumbList"')) throw new Error(`Breadcrumb schema missing: ${basePath}`);
  if (!urls.includes(baseUrl)) throw new Error(`Indexable article missing from sitemap: ${basePath}`);

  const total = Array.isArray(post.series?.parts) ? post.series.parts.length : 1;
  for (let pageNumber = 2; pageNumber <= total; pageNumber += 1) {
    const continuationPath = pagePath(post, pageNumber);
    const continuationFile = pageFile(continuationPath);
    if (!fs.existsSync(continuationFile)) throw new Error(`Missing continuation page: ${continuationPath}`);
    const html = fs.readFileSync(continuationFile, 'utf8');
    if (!html.includes('<meta name="robots" content="noindex,follow,max-image-preview:large,max-snippet:-1">')) {
      throw new Error(`Continuation page must be noindex,follow: ${continuationPath}`);
    }
    if (!html.includes(`<link rel="canonical" href="${baseUrl}">`)) throw new Error(`Continuation canonical must point to base article: ${continuationPath}`);
    if (html.includes('"@type":"Article"') || html.includes('"@type":"FAQPage"')) throw new Error(`Continuation page contains duplicate article schema: ${continuationPath}`);
    if (urls.includes(`${siteUrl}${continuationPath}`)) throw new Error(`Continuation page leaked into sitemap: ${continuationPath}`);
  }
}

console.log(`Build output validated: ${urls.length} indexable sitemap URL(s), ${posts.length} article funnels consolidated.`);
