import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const MARKER = 'data-life-coupang-banner="sitewide-v4"';
const SCRIPT_URL = 'https://ads-partners.coupang.com/g.js';

// Keep the publisher-provided ID, carousel template and tracking code.
// The official responsive widget supports dynamic dimensions.
const BANNER = {
  id: 1046806,
  template: 'carousel',
  trackingCode: 'AF2358798',
  tsource: '',
  desktop: { width: '100%', height: '300' },
  sidebar: { width: '300', height: '500' },
  mobile: { width: '100%', height: '250' },
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// This file is loaded after styles.css, so it owns Coupang layout overrides.
// Expand the desktop content area without touching article typography or data.
const css = [
  '@media(min-width:1100px){.top-strip-inner,.header-inner,.nav-inner,.site-shell,.footer-inner{width:min(calc(100% - 40px),1320px)}.content-grid{grid-template-columns:minmax(0,1fr) 300px;gap:24px}}',
  '.life-coupang-placement{box-sizing:border-box;min-width:0;width:100%;max-width:none;margin:32px 0 38px;padding:16px;background:#f7f9fc;border:1px solid #e0e5ec;clear:both;text-align:center}',
  '.life-coupang-placement--middle{grid-column:1/-1}',
  '.life-coupang-label{font-size:12px;font-weight:750;line-height:1.5;color:#586474;margin:0 0 12px;text-align:left}',
  '.life-coupang-widget{width:100%;max-width:100%;min-width:0;min-height:0;overflow-x:hidden;overflow-y:hidden}',
  '.life-coupang-widget iframe{display:block;max-width:100%;border:0;margin-inline:auto}',
  '.life-coupang-disclosure{font-size:12px;line-height:1.55;color:#68717e;text-align:left;margin:12px 0 0;word-break:keep-all}',
  '.sidebar .life-coupang-placement--rail{width:100%;max-width:300px;min-width:0;padding:0;margin:0 0 20px;border:0;background:transparent}',
  '.sidebar .life-coupang-placement--rail .life-coupang-label{margin:0 0 8px}',
  '.sidebar .life-coupang-placement--rail .life-coupang-disclosure{font-size:11px;margin-top:8px}',
  '@media(max-width:900px){.life-coupang-placement--rail{display:none}}',
  '@media(max-width:700px){.life-coupang-placement{margin:22px 0 28px;padding:10px 0 12px;border-left:0;border-right:0}.life-coupang-label,.life-coupang-disclosure{padding-inline:8px}.life-coupang-widget{max-width:320px;margin-inline:auto}}',
].join('\n');
fs.writeFileSync(path.join(DIST, 'coupang-banner.css'), css + '\n');

// Coupang inserts the iframe next to the executing script. Avoid async
// reconstruction and load its library once in the document head.
function inlineFor(kind) {
  const size = kind === 'rail' ? BANNER.sidebar : BANNER.desktop;
  const config = JSON.stringify({
    id: BANNER.id,
    template: BANNER.template,
    trackingCode: BANNER.trackingCode,
    width: size.width,
    height: size.height,
    tsource: BANNER.tsource,
  });
  return [
    '(function(){',
    'if(' + JSON.stringify(kind) + '==="rail" && window.matchMedia("(max-width:900px)").matches)return;',
    'var options=' + config + ';',
    'if(window.matchMedia("(max-width:700px)").matches){',
    'options.width=' + JSON.stringify(BANNER.mobile.width) + ';',
    'options.height=' + JSON.stringify(BANNER.mobile.height) + ';',
    '}',
    'if(document.body.classList.contains("life-modern-home")&&'+JSON.stringify(kind)+'!=="rail"){',
    'options.height=window.matchMedia("(max-width:700px)").matches?"320":"380";',
    '}',
    'new PartnersCoupang.G(options);',
    '})();',
  ].join('');
}

function block(kind = 'body') {
  return [
    '<aside class="life-coupang-placement life-coupang-placement--' + kind + '" ' + MARKER + ' data-life-coupang-kind="' + kind + '" aria-label="쿠팡 파트너스 광고">',
    '<p class="life-coupang-label">광고 · 쿠팡 파트너스</p>',
    '<div class="life-coupang-widget"><script>' + inlineFor(kind) + '</script></div>',
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

function insertSidebar(html) {
  const anchor = '<aside class="sidebar">';
  // A right rail exists on home, category and all article pages.
  const pos = html.indexOf(anchor);
  if (pos < 0) return html;
  return html.slice(0, pos + anchor.length) + block('rail') + html.slice(pos + anchor.length);
}

let filesChanged = 0;
let adsPlaced = 0;
for (const file of walk(DIST).filter(file => file.endsWith('.html'))) {
  const relative = path.relative(DIST, file).replaceAll(path.sep, '/');
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARKER) || !html.includes('</head>') || !html.includes('</main>')) continue;
  const previous = html;

  if (relative === 'index.html') {
    html = insertAfter(html, /<section class="section"><div class="category-grid">[\s\S]*?<\/section>/g);
    html = insertBefore(html, '</div><aside class="sidebar">');
  } else if (/^(car|support)\/index\.html$/.test(relative)) {
    // Only one end-of-category affiliate widget, after the article cards.
    html = insertBefore(html, '</div></section></div><aside class="sidebar">');
  } else if (/^(car|support)\/[^/]+\/index\.html$/.test(relative)) {
    // Use factual article paragraphs for ad spacing; never reintroduce
    // artificial headings, summaries or editor notes just to anchor ads.
    function inPart(content, partNo, nth, fragment) {
      const marker = '<!-- life-body-part-' + partNo + ' -->';
      const start = content.indexOf(marker);
      if (start < 0) throw new Error('[coupang] Missing real article part ' + partNo + ': ' + relative);
      const next = content.indexOf('<!-- life-body-part-' + (partNo + 1) + ' -->', start);
      const limit = next > 0 ? next : content.indexOf('<div class="disclaimer">', start);
      const segment = content.slice(start, limit > start ? limit : undefined);
      const paras = [...segment.matchAll(/<\/p>/g)];
      const index = paras.length
        ? start + paras[Math.min(nth - 1, paras.length - 1)].index + '</p>'.length
        : start + marker.length;
      return content.slice(0, index) + fragment + content.slice(index);
    }
    html = inPart(html, 2, 2, block('middle'));
  } else if (/^(car|support)\/[^/]+\/[23]\/index\.html$/.test(relative)) {
    html = insertBefore(html, '<section class="source-box">');
  } else {
    html = insertBefore(html, '</main>');
  }

  if (html === previous) html = insertBefore(html, '</main>');
  if (html === previous) throw new Error('[coupang] No main placement in ' + relative);
  // Insert a tall desktop widget at the top of the existing right column.
  // The desktop right sidebar stays editorial; only the homepage source build
  // keeps its original rail as the editorial pass already removes it.
  if(relative === 'index.html') html = insertSidebar(html);

  const bodyUnits = (html.match(/data-life-coupang-kind="(?:body|middle)"/g) || []).length;
  const railUnits = (html.match(/data-life-coupang-kind="rail"/g) || []).length;
  const expectedBody = relative === 'index.html' ? 2 : 1;
  const expectedRail = relative === 'index.html' && previous.includes('<aside class="sidebar">') ? 1 : 0;
  if (bodyUnits !== expectedBody || railUnits !== expectedRail) {
    throw new Error('[coupang] Unexpected positions in ' + relative + ': body=' + bodyUnits + ' rail=' + railUnits);
  }

  html = html.replace('</head>',
    '<link rel="stylesheet" href="/coupang-banner.css"><script src="' + SCRIPT_URL + '"></script></head>');
  fs.writeFileSync(file, html);
  filesChanged++;
  adsPlaced += bodyUnits + railUnits;
}

if (!filesChanged) throw new Error('[coupang] No HTML pages updated.');
console.log('[coupang] ' + adsPlaced + ' larger body/rail slots in ' + filesChanged + ' HTML pages.');