import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const original = (process.env.PUBLIC_COUPANG_BANNER_HTML || '').trim();
const marker = 'data-life-coupang-banner="sitewide-v2"';

if (!original) {
  console.log('[coupang] Banner is disabled until real partner code is provided.');
} else {
  if (!/(?:ads-partners\.coupang\.com|coupa\.ng)/i.test(original)
      || !/(?:<script\b|<iframe\b|<a\b)/i.test(original)) {
    throw new Error('[coupang] Expected official Coupang Partners HTML embed code.');
  }
  // Coupang's official dynamic widget supports a percentage width override.
  // Preserve all publisher IDs, tracking code, template, category and height.
  const embed = original.replace(/(["']width["']\s*:\s*)["']\d+["']/i, '$1"100%"');
  const css = [
    '.life-coupang-placement{max-width:680px;width:100%;box-sizing:border-box;margin:30px auto 36px;text-align:center;clear:both}',
    '.life-coupang-label{margin:0 0 12px;font-size:12px;font-weight:700;color:#586474}',
    '.life-coupang-widget{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain}',
    '.life-coupang-widget iframe{max-width:100%;border:0}',
    '.life-coupang-disclosure{font-size:12px;line-height:1.6;color:#68717e;text-align:left;margin:12px 0 0;word-break:keep-all}',
    '@media(max-width:700px){.life-coupang-placement{margin:24px auto 28px}.life-coupang-label{margin-bottom:8px}}',
  ].join('\n');
  fs.writeFileSync(path.join(dist, 'coupang-banner.css'), css + '\n');

  const block = [
    '<aside class="life-coupang-placement" ' + marker + ' aria-label="쿠팡 파트너스 광고">',
    '<p class="life-coupang-label">광고 · 쿠팡 파트너스</p>',
    '<div class="life-coupang-widget">' + embed + '</div>',
    '<p class="life-coupang-disclosure">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>',
    '</aside>',
  ].join('');

  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  }
  function after(html, pattern, nth = 1) {
    const matches = [...html.matchAll(pattern)];
    if (!matches.length) return html;
    const match = matches[Math.min(nth - 1, matches.length - 1)];
    const index = match.index + match[0].length;
    return html.slice(0, index) + block + html.slice(index);
  }
  function before(html, literal) {
    return html.includes(literal) ? html.replace(literal, block + literal) : html;
  }

  let pages = 0;
  let placements = 0;
  for (const file of walk(dist).filter(p => p.endsWith('.html'))) {
    const relative = path.relative(dist, file).replaceAll(path.sep, '/');
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes(marker) || !html.includes('</main>')) continue;
    const start = html;
    if (relative === 'index.html') {
      html = after(html, /<section class="section"><div class="category-grid">[\s\S]*?<\/section>/g);
      html = before(html, '</div><aside class="sidebar">');
    } else if (/^(car|support)\/index\.html$/.test(relative)) {
      html = after(html, /<article class="post-card">[\s\S]*?<\/article>/g, 6);
      html = before(html, '</div></section></div><aside class="sidebar">');
    } else if (/^(car|support)\/[^/]+\/index\.html$/.test(relative)) {
      const headings = [...html.matchAll(/<h2 class="series-part-title">/g)];
      if (headings.length >= 3) {
        const i = headings[2].index;
        html = html.slice(0, i) + block + html.slice(i);
      } else {
        html = before(html, '<div class="disclaimer">');
      }
      html = before(html, '<section class="source-box">');
    } else if (/^(car|support)\/[^/]+\/[23]\/index\.html$/.test(relative)) {
      html = before(html, '<section class="source-box">');
    } else {
      html = before(html, '</main>');
    }
    if (html === start) html = before(html, '</main>');
    if (html === start) throw new Error('[coupang] No placement in ' + relative);
    const count = (html.match(/data-life-coupang-banner="sitewide-v2"/g) || []).length;
    html = html.replace('</head>', '<link rel="stylesheet" href="/coupang-banner.css"></head>');
    fs.writeFileSync(file, html);
    pages++;
    placements += count;
  }
  if (!pages) throw new Error('[coupang] No HTML pages updated.');
  console.log('[coupang] ' + placements + ' placements across ' + pages + ' pages.');
}
