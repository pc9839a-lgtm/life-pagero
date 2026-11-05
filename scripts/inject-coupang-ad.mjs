import fs from 'node:fs';
import path from 'node:path';

// Embed HTML is issued by Coupang Partners and provided at build time.
// Do not display fake ads when the actual publisher embed is absent.
const DIST = path.resolve('dist');
const embed = (process.env.PUBLIC_COUPANG_BANNER_HTML || '').trim();
const marker = 'data-life-coupang-banner="sitewide-v1"';

if (!embed) {
  console.log('[coupang] No banner code configured; site-wide slot stays disabled.');
} else {
  if (!/(?:ads-partners\.coupang\.com|coupa\.ng)/i.test(embed)
      || !/(?:<script\b|<iframe\b|<a\b)/i.test(embed)) {
    throw new Error('[coupang] PUBLIC_COUPANG_BANNER_HTML must contain a Coupang Partners embed, not a placeholder.');
  }
  const stylesheet = [
    '.life-coupang-placement{box-sizing:border-box;width:min(100% - 32px,680px);margin:32px auto 40px;padding:0;text-align:center}',
    '.life-coupang-label{margin:0 0 12px;font-size:12px;font-weight:700;color:#5c6573;letter-spacing:.02em}',
    '.life-coupang-widget{max-width:100%;overflow-x:auto;overflow-y:hidden;margin:0 auto;overscroll-behavior-x:contain}',
    '.life-coupang-widget iframe{max-width:100%;border:0}',
    '.life-coupang-disclosure{max-width:680px;margin:10px 0 0;color:#5b6575;font-size:12px;line-height:1.65;word-break:keep-all}',
    '@media(max-width:600px){.life-coupang-placement{margin:24px auto 30px}.life-coupang-label{margin-bottom:8px}}',
  ].join('\n');
  fs.writeFileSync(path.join(DIST, 'coupang-banner.css'), stylesheet + '\n');
  const block = [
    '<section class="life-coupang-placement" ' + marker + ' aria-label="쿠팡 파트너스 광고">',
    '<p class="life-coupang-label">광고 · 쿠팡 파트너스</p>',
    '<div class="life-coupang-widget">' + embed + '</div>',
    '<p class="life-coupang-disclosure">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>',
    '</section>',
  ].join('');
  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  }
  let count = 0;
  for (const file of walk(DIST).filter(file => file.endsWith('.html'))) {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes(marker)) continue;
    if (!html.includes('</main>') || !html.includes('</head>')) continue;
    html = html.replace('</head>', '<link rel="stylesheet" href="/coupang-banner.css"></head>');
    html = html.replace('</main>', block + '</main>');
    fs.writeFileSync(file, html);
    count += 1;
  }
  if (!count) throw new Error('[coupang] No pages accepted site-wide banner injection.');
  console.log('[coupang] Added the same banner to ' + count + ' HTML page(s).');
}
