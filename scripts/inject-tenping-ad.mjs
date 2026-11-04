import fs from 'node:fs';
import path from 'node:path';

// Keep this sponsored unit separate from independently edited policy articles.
// The original campaign tracking destination is preserved exactly.
const DIST = path.resolve('dist');
const CAMPAIGN_ID = 'tenping-auto-lease-202610';
const offer = [
  '<aside class="life-affiliate" data-affiliate="' + CAMPAIGN_ID + '" aria-label="광고 및 제휴 콘텐츠">',
  '<p class="life-affiliate-label">광고 · 제휴</p>',
  '<a class="life-affiliate-image" href="https://iryan.kr/t8hckabtgd" target="_blank" rel="sponsored noopener noreferrer" aria-label="신차 장기렌트·리스 견적 비교 상담">',
  '<img src="https://img.tenping.kr/Content/Upload/Images/2026100118010001_Dis_20261001180129.png" width="800" height="450" loading="lazy" decoding="async" alt="신차 장기렌트·리스 견적 비교 상담 광고">',
  '</a>',
  '<div class="life-affiliate-copy">',
  '<p class="life-affiliate-title">AI로 신차 장기렌트·리스 견적 비교하고, 상담부터 출고까지</p>',
  '<a class="life-affiliate-action" href="https://iryan.kr/t8hckabtgd" target="_blank" rel="sponsored noopener noreferrer">상담 신청하기 <span aria-hidden="true">→</span></a>',
  '</div>',
  '<p class="life-affiliate-notice">이 페이지에는 제휴 광고가 포함되어 있으며, 상담 신청 등에 따라 운영자에게 수익이 발생할 수 있습니다.</p>',
  '</aside>',
].join('');

function insertBefore(relative, anchor, block) {
  const target = path.join(DIST, relative);
  if (!fs.existsSync(target)) throw new Error('Affiliate target page not found: ' + relative);
  const html = fs.readFileSync(target, 'utf8');
  if (html.includes('data-affiliate="' + CAMPAIGN_ID + '"')) return false;
  if (!html.includes(anchor)) throw new Error('Affiliate placement not found in ' + relative);
  fs.writeFileSync(target, html.replace(anchor, block + anchor));
  return true;
}

let updated = 0;
// One unit on the homepage and in the car category, not on policy support pages.
if (insertBefore('index.html', '<section class="section life-pathways"', '<section class="life-affiliate-placement" aria-label="자동차 관련 제휴 광고">' + offer + '</section>')) updated++;
if (insertBefore('car/index.html', '<section class="main-column section">', '<div class="life-affiliate-placement">' + offer + '</div>')) updated++;

// First (indexable) page only. Avoid duplicate ads on /2/ and /3/ reading pages.
for (const slug of ['used-car-online-transfer', 'used-car-transfer-cost', 'used-car-transfer-documents']) {
  if (insertBefore('car/' + slug + '/index.html', '<div class="disclaimer">', offer)) updated++;
}
console.log('[affiliate] Tenping auto-rental/lease offer present on 5 pages; updated ' + updated + ' page(s).');
