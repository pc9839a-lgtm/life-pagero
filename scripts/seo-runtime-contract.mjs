import fs from 'node:fs';
import path from 'node:path';

// Checks the *public* response, not the origin's expected build output.
const PUBLIC = 'https://pagero.kr/life';
const LEGACY = 'https://life.pagero.kr';
const ORIGIN = 'https://life-pagero.pages.dev';
const errors = [];
const checked = [];
const warnings = [];

function fail(url, reason) {
  errors.push({ url, reason });
}
async function get(url) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
    headers: {
      accept: 'text/html,application/xml,text/plain;q=0.9,*/*;q=0.5',
      'user-agent': 'LifePageroSeoQA/1.0 (+https://pagero.kr/life/)',
    },
  });
  const content = await response.text();
  return { status: response.status, headers: response.headers, content };
}
async function check(label, url, validate) {
  try {
    const result = await get(url);
    validate(result);
    checked.push({ label, url, status: result.status });
  } catch (error) {
    fail(url, String(error?.message || error));
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function robotsMeta(html) {
  return html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0] || '';
}
function canonicalHref(html) {
  return html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] || '';
}
function assertIndexable({ status, headers, content }, url) {
  assert(status === 200, 'Expected 200, received HTTP ' + status);
  assert(!/\bnoindex\b/i.test(headers.get('X-Robots-Tag') || ''), 'Public X-Robots-Tag contains noindex');
  const robots = robotsMeta(content);
  assert(robots && !/\bnoindex\b/i.test(robots), 'Missing or noindex meta robots tag');
  assert(canonicalHref(content) === url, 'Canonical mismatch: ' + canonicalHref(content));
  assert((content.match(/<h1(?:\s[^>]*)?>/gi) || []).length === 1, 'Expected exactly one H1');
}
const sitemapUrl = PUBLIC + '/sitemap.xml';
let urls = [];
await check('robots', PUBLIC + '/robots.txt', ({ status, content }) => {
  assert(status === 200, 'robots.txt HTTP ' + status);
  assert(content.includes('Sitemap: ' + sitemapUrl), 'Missing canonical sitemap declaration');
});
await check('sitemap', sitemapUrl, ({ status, content }) => {
  assert(status === 200, 'sitemap.xml HTTP ' + status);
  assert(/<urlset\b/.test(content), 'Sitemap XML urlset missing');
  urls = [...content.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => match[1].replace(/&amp;/g, '&'));
  assert(urls.length >= 10, 'Sitemap unexpectedly small: ' + urls.length);
  assert(new Set(urls).size === urls.length, 'Duplicate sitemap URLs');
  assert(urls.every(url => url.startsWith(PUBLIC + '/')), 'Noncanonical sitemap URL found');
  assert(urls.every(url => !/\/(?:2|3)\/$/.test(url)), 'Continuation URL leaked into sitemap');
});
const limit = 5;
let cursor = 0;
await Promise.all(Array.from({ length: limit }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    await check('indexable', url, result => assertIndexable(result, url));
  }
}));
for (const relative of ['/', '/car/car-inspection-period/', '/support/child-allowance-2026/']) {
  const old = LEGACY + relative + '?utm_source=seo-runtime-qa';
  const expected = PUBLIC + relative + '?utm_source=seo-runtime-qa';
  await check('legacy-301', old, ({ status, headers }) => {
    assert(status === 301, 'Expected single permanent 301; received ' + status);
    assert(new URL(headers.get('location') || '', old).href === expected,
      'Legacy Location incorrect: ' + headers.get('location'));
  });
}
await check('origin-noindex', ORIGIN + '/', ({ status, headers }) => {
  assert(status === 200, 'Origin returned ' + status);
  assert(/\bnoindex\b/i.test(headers.get('X-Robots-Tag') || ''),
    'Cloudflare preview origin unexpectedly indexable');
});
await check('utility-noindex', PUBLIC + '/deals/', ({ status, content }) => {
  assert(status === 200, 'Utility returned ' + status);
  assert(/\bnoindex\b/i.test(robotsMeta(content)), 'Deals utility is indexable');
});
if (!urls.length) warnings.push('No sitemap URLs could be audited');
const report = {
  auditedAt: new Date().toISOString(),
  publicBase: PUBLIC,
  indexableUrls: urls.length,
  checked: checked.length,
  warnings,
  errors,
};
const reportPath = process.env.SEO_AUDIT_REPORT || 'artifacts/seo-runtime-audit.json';
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log('[seo-runtime] checked=' + checked.length + ', sitemapURLs=' + urls.length
  + ', errors=' + errors.length + ', warnings=' + warnings.length);
for (const error of errors) console.error('[seo-runtime] FAIL ' + error.url + ' : ' + error.reason);
for (const warning of warnings) console.warn('[seo-runtime] WARN ' + warning);
if (errors.length) process.exitCode = 1;
