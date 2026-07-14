import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
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
if (urls.length < 10) throw new Error(`Sitemap contains too few URLs: ${urls.length}`);
if (urls.some((url) => !url.startsWith('https://life.pagero.kr/'))) {
  throw new Error('Sitemap contains a URL outside https://life.pagero.kr/');
}
if (new Set(urls).size !== urls.length) throw new Error('Sitemap contains duplicate URLs');

console.log(`Build output validated: ${urls.length} sitemap URL(s).`);
