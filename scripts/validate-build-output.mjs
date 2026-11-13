import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const CONTENT_ROOT = path.resolve('content/posts');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://pagero.kr/life').replace(/\/$/, '');

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
  ['robots.txt', `Sitemap: ${SITE_URL}/sitemap.xml`],
  ['sitemap.xml', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'],
  ['sitemap-index.xml', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'],
];

for (const [relativePath, expected] of requiredOutputs) {
  const file = path.join(DIST, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Missing build output: ${relativePath}`);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(expected)) throw new Error(`Invalid build output: ${relativePath}`);
}

const originHeaderPath = path.join(DIST, '_headers');
if (!fs.existsSync(originHeaderPath)) throw new Error('Missing Cloudflare immutable-origin _headers');
const originHeaders = fs.readFileSync(originHeaderPath, 'utf8');
if (!/^\/\*\s*\n\s*X-Robots-Tag:\s*noindex,\s*follow,\s*noarchive/m.test(originHeaders)) {
  throw new Error('Cloudflare immutable Pages origin must remain noindex; public pagero.kr proxy strips X-Robots-Tag');
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

// All article images must be unique across the published archive; generated
// editorial diagrams must exist in the deployed asset directory.
const imageOwners = new Map();
let generatedImageCount = 0;
for (const post of posts) {
  for (const [index, part] of (post.series?.parts || []).entries()) {
    const url = part.image;
    if (!url) continue;
    if (imageOwners.has(url)) {
      throw new Error('Duplicate published article image: ' + url + ' (' + imageOwners.get(url) + ', ' + post.slug + ')');
    }
    imageOwners.set(url, post.slug + ' part ' + (index + 1));
    const generatedPrefix = SITE_URL + '/images/editorial/';
    if (!url.startsWith(generatedPrefix)) continue;
    const filename = url.slice(generatedPrefix.length);
    if (!/^[a-z0-9-]+\.svg$/.test(filename)) {
      throw new Error('Unsafe generated editorial image path: ' + url);
    }
    const asset = path.join(DIST, 'images', 'editorial', filename);
    if (!fs.existsSync(asset)) throw new Error('Missing generated illustration: ' + asset);
    const svg = fs.readFileSync(asset, 'utf8');
    if (!svg.startsWith('<svg ') || !svg.includes('<text ') || !svg.includes('aria-label=')) {
      throw new Error('Generated illustration is missing its semantic content: ' + asset);
    }
    if (!part.imageAlt || !part.imageAlt.includes(post.title)) {
      throw new Error('Missing accessible image description: ' + url);
    }
    generatedImageCount += 1;
  }
}
console.log('[images] Verified ' + imageOwners.size + ' unique article image URLs, including ' + generatedImageCount + ' local editorial illustrations.');

for (const post of posts) {
  const basePath = pagePath(post, 1);
  const baseUrl = `${SITE_URL}${basePath}`;
  const baseFile = pageFile(basePath);
  if (!fs.existsSync(baseFile)) throw new Error(`Missing base article page: ${basePath}`);

  const baseHtml = fs.readFileSync(baseFile, 'utf8');
  const firstPart = post.series?.parts?.[0];
  const firstImage = firstPart?.image;
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
    throw new Error(`FAQ schema missing from the indexable first page: ${basePath}`);
  }
  if (!firstPart) {
    throw new Error(`First series part missing: ${basePath}`);
  }
  if (!baseHtml.includes('<!-- life-body-part-1 -->')) {
    throw new Error(`Base page missing first article body section: ${basePath}`);
  }
  if (firstImage && !baseHtml.includes(`<img src="${escapedFirstImage}"`)) {
    throw new Error(`Base page missing first part image: ${basePath}`);
  }
  if (baseHtml.includes('class="series-full-guide"') || baseHtml.includes('data-full-guide="true"')) {
    throw new Error(`Base page still contains the former all-in-one guide wrapper: ${basePath}`);
  }

  // Every substantive section must be visible on the indexable first URL.
  for (const [index] of post.series.parts.entries()) {
    if (!baseHtml.includes(`<!-- life-body-part-${index + 1} -->`)) {
      throw new Error(`Base page missing article body section ${index + 1}: ${basePath}`);
    }
  }
  const articleSection = baseHtml.match(/<div class="article-content">([\s\S]*?)<div class="disclaimer">/)?.[1] || '';
  if (baseHtml.includes('class="series-part-title"') || /<h[234](?:\s[^>]*)?>/.test(articleSection)) {
    throw new Error(`Unwanted article subheadings remain: ${basePath}`);
  }

  const total = Array.isArray(post.series?.parts) ? post.series.parts.length : 1;
  if (total > 1) {
    const nextPath = pagePath(post, 2);
    if (!baseHtml.includes(`href="${nextPath}"`)) {
      throw new Error(`Base page missing next-content link: ${basePath}`);
    }
  }

  for (const source of post.sources || []) {
    const sourceLink = `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>`;
    if (!baseHtml.includes(sourceLink)) {
      throw new Error(`Base page missing clickable official source "${source.name}": ${basePath}`);
    }
  }

  if (!urls.includes(baseUrl)) throw new Error(`Indexable article missing from sitemap: ${basePath}`);

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
    if (part && !html.includes(`<!-- life-body-part-${pageNumber} -->`)) {
      throw new Error(`Continuation page missing body section ${pageNumber}: ${continuationPath}`);
    }
    for (const [index] of post.series.parts.entries()) {
      if (index === pageNumber - 1) continue;
      if (html.includes(`<!-- life-body-part-${index + 1} -->`)) {
        throw new Error(`Continuation page contains another body section: ${continuationPath}`);
      }
    }
  }
}

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));

// Coupang Partners: validate large desktop body units, the right-rail unit,
// the mobile fallback and one third-party loader per generated HTML page.
const coupangCss = fs.readFileSync(path.join(DIST, 'coupang-banner.css'), 'utf8');
for (const token of ['1320px', 'max-width:300px', 'max-width:320px', '.life-coupang-placement--rail{display:none}']) {
  if (!coupangCss.includes(token)) throw new Error('Coupang layout rule missing: ' + token);
}
for (const file of htmlFiles) {
  const relative = path.relative(DIST, file).replaceAll(path.sep, '/');
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('</main>')) continue;

  const expectedBody = relative === 'index.html' ? 2 : 1;
  const expectedRail = relative === 'index.html' && html.includes('<aside class="sidebar">') ? 1 : 0;
  const actualBody = count(html, /data-life-coupang-kind="(?:body|middle)"/g);
  const actualRail = count(html, /data-life-coupang-kind="rail"/g);
  if (actualBody !== expectedBody || actualRail !== expectedRail) {
    throw new Error('Coupang body/rail mismatch in ' + relative + ': ' + actualBody + '/' + actualRail
      + ' expected ' + expectedBody + '/' + expectedRail);
  }
  const total = expectedBody + expectedRail;
  if (count(html, /data-life-coupang-banner="sitewide-v4"/g) !== total) {
    throw new Error('Coupang placement marker count mismatch: ' + relative);
  }
  if (count(html, /<script src="https:\/\/ads-partners\.coupang\.com\/g\.js"><\/script>/g) !== 1
      || count(html, /new PartnersCoupang\.G\(options\)/g) !== total) {
    throw new Error('Coupang loader or initializer missing/duplicated in ' + relative);
  }
  if (!html.includes('"id":1046806') || !html.includes('"trackingCode":"AF2358798"')
      || !html.includes('"height":"300"') || !html.includes('options.width="100%"')
      || !html.includes('options.height="250"')
      || !html.includes('쿠팡 파트너스 활동의 일환')) {
    throw new Error('Coupang large banner, mobile fallback or disclosure missing in ' + relative);
  }
  if (expectedRail && (!html.includes('"height":"500"')
    || html.indexOf('data-life-coupang-kind="rail"') <= html.indexOf('<aside class="sidebar">'))) {
    throw new Error('Coupang rail unit missing from existing right sidebar in ' + relative);
  }
}

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

// AdSense phase 3: validate the generated public privacy notice and identity,
// not just that the policy URL exists. Never mistake this for Google approval.
const privacyFile = path.join(DIST, 'privacy-policy', 'index.html');
if (!fs.existsSync(privacyFile)) throw new Error('Privacy policy output is missing');
const privacyHtml = fs.readFileSync(privacyFile, 'utf8');
for (const required of [
  'Google AdSense', '제3자', '쿠키', '웹 비콘', 'IP 주소',
  'https://adssettings.google.com/',
  'https://policies.google.com/technologies/partner-sites',
]) {
  if (!privacyHtml.includes(required)) throw new Error(`AdSense privacy disclosure missing: ${required}`);
}
const client = process.env.PUBLIC_ADSENSE_CLIENT || 'ca-pub-1906196934401001';
const publisherId = client.match(/^ca-pub-(\d+)$/)?.[1];
if (!publisherId) throw new Error('AdSense publisher client format is invalid');
const adsTxtFile = path.join(DIST, 'ads.txt');
if (!fs.existsSync(adsTxtFile)) throw new Error('Publisher ads.txt output is missing');
const adsTxt = fs.readFileSync(adsTxtFile, 'utf8');
if (!adsTxt.includes(`google.com, pub-${publisherId}, DIRECT, f08c47fec0942fa0`)) {
  throw new Error('Publisher ads.txt and PUBLIC_ADSENSE_CLIENT are inconsistent');
}
if (process.env.PUBLIC_ADSENSE_ADS_ENABLED !== 'true') {
  for (const file of htmlFiles) {
    if (fs.readFileSync(file, 'utf8').includes('data-enabled="true"')) {
      throw new Error(`Unexpected live ad slot before ads are enabled: ${path.relative(DIST, file)}`);
    }
  }
}

// Editorial value gate: practical scenario tables must appear only on canonical
// first pages, keep the official-source review dates visible and preserve links.
const decisionPages = [
  'car/car-inspection-period',
  'car/car-inspection-reservation',
  'car/used-car-transfer-documents',
  'car/used-car-transfer-cost',
  'support/child-allowance-2026',
  'support/parental-benefit-2026',
  'support/livelihood-benefit-2026',
  'support/housing-benefit-2026',
];
for (const slug of decisionPages) {
  const html=fs.readFileSync(path.join(DIST,slug,'index.html'),'utf8');
  if (count(html,/class="reader-decision"/g)!==1) {
    throw new Error('Canonical guide needs exactly one editorial decision table: '+slug);
  }
  const section=html.match(/<section class="reader-decision"[\s\S]*?<\/section>/)?.[0] || '';
  if (count(section,/<tr>/g)<3 || section.includes('아래 표는 선택할 글')) {
    throw new Error('Decision table must offer source-dated real next steps: '+slug);
  }
  if (!html.includes('/life-editorial-20261022.css')) {
    throw new Error('Decision table styles missing: '+slug);
  }
  const source=path.join(CONTENT_ROOT,slug+'.json');
  const post=JSON.parse(fs.readFileSync(source,'utf8'));
  for (let page=2;page<= (post.series?.parts?.length || 1);page++) {
    const file=pageFile('/'+slug+'/'+page+'/');
    if(fs.existsSync(file) && fs.readFileSync(file,'utf8').includes('class="reader-decision"')) {
      throw new Error('Decision table must not duplicate on continuation: '+slug+'/'+page);
    }
  }
}
const policy=fs.readFileSync(path.join(DIST,'editorial-standards','index.html'),'utf8');
if (!policy.includes('작성·검수 기준 확인일: 2026-10-23')) {
  throw new Error('Editorial policy must expose a stable reviewed date, not build time');
}
if (!sitemap.includes('<loc>'+SITE_URL+'/editorial-standards/</loc><lastmod>2026-10-23</lastmod>')) {
  throw new Error('Editorial policy sitemap lastmod must reflect the genuine editorial date');
}

// Editorial freshness gate: preserve the distinct *real* review dates of
// the annual guide and the November update to the second-half car-tax guide.
// Avoid pinning both documents to an obsolete October modification date.
for (const [slug, reviewed, phrases] of [
  ['car-tax-annual-payment-2026', '2026-10-26',
    ['2026년 10월 26일 현재 연납 신청은', '2027년 공식']],
  ['car-tax-second-half-2026', '2026-11-11',
    ['11월 11일 현재', '12월 16~31일', '10만 원 이하', '증빙된 양도일', '연세액 납부승계']],
]) {
  const permalink = '/car/' + slug + '/';
  const html = fs.readFileSync(pageFile(permalink), 'utf8');
  for (const phrase of phrases) {
    if (!html.includes(phrase)) throw new Error(slug + ': verified guidance missing from indexable HTML: ' + phrase);
  }
  if (!html.includes('"dateModified":"' + reviewed + '"')) {
    throw new Error(slug + ': article schema must reflect its actual editorial review date '+reviewed);
  }
  const expected = SITE_URL + permalink;
  if (!sitemap.includes('<loc>' + expected + '</loc><lastmod>' + reviewed + '</lastmod>')) {
    throw new Error(slug + ': sitemap lastmod must show content modification '+reviewed);
  }
}


// Verify the newly published 2026 year-end preview article is present in the
// FINAL output (not merely the source JSON or an outdated compressed bundle).
const taxPreviewSlug='year-end-tax-precheck-2026';
const taxPreviewPath='/support/'+taxPreviewSlug+'/';
const taxPreviewHtml=fs.readFileSync(pageFile(taxPreviewPath),'utf8');
for(const phrase of [
  '2026년 10월 28일','12월 18일','1~9월','10~12월',
  '900만원 + 300만원 = 1,200만원','전년도 지급명세서',
  '2027년',
]) {
  if(!taxPreviewHtml.includes(phrase)) throw new Error('2026 year-end tax guide is missing content: '+phrase);
}
if(!taxPreviewHtml.includes('rel="canonical" href="https://pagero.kr/life'+taxPreviewPath+'"')){
  throw new Error('2026 year-end tax guide has incorrect canonical URL');
}
if(!taxPreviewHtml.includes('"dateModified":"2026-11-04"')){
  throw new Error('New tax guide article structured-data date is incorrect');
}
if(!sitemap.includes('<loc>https://pagero.kr/life'+taxPreviewPath+'</loc><lastmod>2026-11-04</lastmod>')){
  throw new Error('2026 year-end tax guide is missing from first-page sitemap');
}
for(const name of ['calendar','inputs','checklist']){
  const filename='year-end-tax-precheck-2026-'+name+'.svg';
  const asset=path.join(DIST,'images',filename);
  if(!fs.existsSync(asset)) throw new Error('Original tax guide infographic not copied: '+filename);
  if(!taxPreviewHtml.includes('/life/images/'+filename)){
    throw new Error('Original infographic absent from canonical article: '+filename);
  }
}

console.log(`Build output validated: ${urls.length} sitemap URL(s), ${posts.length} indexable first pages, ${htmlFiles.length} HTML file(s), distinct series content per page, no duplicate SEO tags, progress UI, editorial-policy output, or broken internal links.`);
