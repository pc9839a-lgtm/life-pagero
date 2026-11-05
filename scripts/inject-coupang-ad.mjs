import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const MARKER = 'data-life-coupang-banner="sitewide-v3"';
const SCRIPT_URL = 'https://ads-partners.coupang.com/g.js';

// Exact publisher credentials and banner formats supplied by the site owner.
// Only the size changes at the breakpoint; all other Coupang fields are kept.
const BANNER = {
  id: 1046806,
  template: 'carousel',
  trackingCode: 'AF2358798',
  tsource: '',
  desktop: { width: '680', height: '180' },
  mobile: { width: '320', height: '250' },
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const css = [
  '.life-coupang-placement{box-sizing:border-box;max-width:680px;width:100%;min-width:0;margin:30px auto 36px;clear:both;text-align:center}',
  '.life-coupang-placement--middle{grid-column:1/-1}',
  '.life-coupang-label{font-size:12px;font-weight:700;color:#586474;margin:0 0 10px}',
  '.life-coupang-widget{max-width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain}',
  '.life-coupang-widget iframe{max-width:100%;border:0}',
  '.life-coupang-disclosure{font-size:12px;line-height:1.6;color:#68717e;text-align:left;margin:10px 0 0;word-break:keep-all}',
  '@media(max-width:700px){.life-coupang-placement{margin:25px auto 30px}}',
].join('\n');
fs.writeFileSync(path.join(DIST, 'coupang-banner.css'), css + '\n');

// The Coupang constructor runs synchronously while its script element is being
// parsed, so the third-party banner is inserted at the correct DOM location.
// The external library is included only once per page; each slot runs G once.
const options = JSON.stringify({
  id: BANNER.id,
  template: BANNER.template,
  trackingCode: BANNER.trackingCode,
  width: BANNER.desktop.width,
  height: BANNER.desktop.height,
  tsource: BANNER.tsource,
});
const inline = [
  '(function(){',
  'var options=' + options + ';',
  'if(window.matchMedia("(max-width:700px)").matches){',
  'options.width=window.innerWidth<352?"100%":"' + BANNER.mobile.width + '";',
  'options.height="' + BANNER.mobile.height + '";',
  '}',
  'new PartnersCoupang.G(options);',
  '})();',
].join('');

function block(kind = 'body') {
  return [
    '<aside class="life-coupang-placement life-coupang-placement--' + kind + '" ' + MARKER + ' aria-label="쿠팡 파트너스 광고">',
    '<p class="life-coupang-label">광고 · 쿠팡 파트너스</p>',
    '<div class="life-coupang-widget"><script>' + inline + '</script></div>',
    '<p class="life-coupang-disclosure">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>',
    '</aside>',
  ].join('');
}

function insertAfter(html, re, nth = 1) {
  const matches = [...html.matchAll(re)];
  if (!matches.length) return html;
  const match = matches[Math.min(nth - 1, matches.length - 1)];
  const index = match.index + match[0].length;
  return html.slice(0, index) + block('middle') + html.slice(index);
}

function insertBefore(html, anchor) {
  return html.includes(anchor) ? html.replace(anchor, block('body') + anchor) : html;
}

let filesChanged = 0;
let adsPlaced = 0;

for (const file of walk(DIST).filter(file => file.endsWith('.html'))) {
  const relative = path.relative(DIST, file).replaceAll(path.sep, '/');
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARKER) || !html.includes('</head>') || !html.includes('</main>')) continue;

  const previous = html;
  if (relative === 'index.html') {
    // Home: after the category cards, then before the sidebar.
    html = insertAfter(html, /<section class="section"><div class="category-grid">[\s\S]*?<\/section>/g);
    html = insertBefore(html, '</div><aside class="sidebar">');
  } else if (/^(car|support)\/index\.html$/.test(relative)) {
    // Category: between list cards and at the end of the list.
    html = insertAfter(html, /<article class="post-card">[\s\S]*?<\/article>/g, 6);
    html = insertBefore(html, '</div></section></div><aside class="sidebar">');
  } else if (/^(car|support)\/[^/]+\/index\.html$/.test(relative)) {
    // Primary guides: after the second content segment, then before sources.
    const summaries = [...html.matchAll(/<section class="key-summary">[\s\S]*?<\/section>/g)];
    if (summaries.length >= 3) {
      const match = summaries[2];
      const i = match.index + match[0].length;
      html = html.slice(0, i) + block('middle') + html.slice(i);
    } else {
      html = insertBefore(html, '<div class="disclaimer">');
    }
    html = insertBefore(html, '<section class="source-box">');
  } else if (/^(car|support)\/[^/]+\/[23]\/index\.html$/.test(relative)) {
    // Continuation pages have less content; one unit is sufficient.
    html = insertBefore(html, '<section class="source-box">');
  } else {
    // Static information, contact and policy pages: one unit.
    html = insertBefore(html, '</main>');
  }

  if (html === previous) html = insertBefore(html, '</main>');
  if (html === previous) throw new Error('[coupang] Placement missing in ' + relative);

  const count = (html.match(/data-life-coupang-banner="sitewide-v3"/g) || []).length;
  const expected = relative === 'index.html'
    || /^(car|support)\/index\.html$/.test(relative)
    || /^(car|support)\/[^/]+\/index\.html$/.test(relative)
      ? 2 : 1;
  if (count !== expected) throw new Error('[coupang] Expected ' + expected + ' slots in ' + relative + ', found ' + count);

  html = html.replace('</head>',
    '<link rel="stylesheet" href="/coupang-banner.css"><script src="' + SCRIPT_URL + '"></script></head>');
  fs.writeFileSync(file, html);
  filesChanged++;
  adsPlaced += count;
}

if (!filesChanged) throw new Error('[coupang] No HTML pages updated.');
console.log('[coupang] ' + adsPlaced + ' responsive slots in ' + filesChanged + ' HTML pages.');