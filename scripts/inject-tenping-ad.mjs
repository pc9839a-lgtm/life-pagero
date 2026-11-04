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


// Three additional Tenping placements supplied by the site owner.
// Kept as discrete sponsored cards rather than mixing them into editorial text.
const additionalCampaigns = [
  {
    id: 'tenping-pon-gabi-2026',
    href: 'https://iryan.kr/t8hckab8vo',
    image: 'https://img.tenping.kr/Content/Upload/Images/2026073016260001_Dis_20260923152711.png',
    title: 'S급 중고 디바이스 최저가구매, 폰가비',
    action: '상담 신청하기',
  },
  {
    id: 'tenping-mbti-relationship-2026',
    href: 'https://iryan.kr/t8hckab8vp',
    image: 'https://img.tenping.kr/Content/Upload/Images/2025120422540001_Dis_20251205102648.jpg',
    title: '내 MBTI와 딱 맞는 사람은 어딨을까? 연애스타일 테스트해보기',
    action: '상담 신청하기',
  },
  {
    id: 'tenping-elementary-education-2026',
    href: 'https://iryan.kr/t8hckacv03',
    image: 'https://img.tenping.kr/Content/Upload/Images/2019122614580001_Dis_20251201182937.jpg',
    title: "전 과목 스타 선생님+영수 심화+영재교육원까지! 초등 인강 '엘리하이'",
    action: '상담 신청하기',
  },
];

const escapeAd = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));
function supplementalCard(campaign, { withNotice = true } = {}) {
  const href = escapeAd(campaign.href);
  const title = escapeAd(campaign.title);
  return [
    '<aside class="life-affiliate" data-affiliate="' + escapeAd(campaign.id) + '" aria-label="광고 및 제휴 콘텐츠">',
    '<p class="life-affiliate-label">광고 · 제휴</p>',
    '<a class="life-affiliate-image" href="' + href + '" target="_blank" rel="sponsored noopener noreferrer" aria-label="' + title + '">',
    '<img src="' + escapeAd(campaign.image) + '" width="800" loading="lazy" decoding="async" alt="' + title + ' 광고">',
    '</a>',
    '<div class="life-affiliate-copy"><p class="life-affiliate-title">' + title + '</p>',
    '<a class="life-affiliate-action" href="' + href + '" target="_blank" rel="sponsored noopener noreferrer">' + escapeAd(campaign.action) + ' <span aria-hidden="true">→</span></a></div>',
    withNotice ? '<p class="life-affiliate-notice">이 광고를 통한 성과에 따라 사이트 운영자에게 수익이 발생할 수 있습니다.</p>' : '',
    '</aside>',
  ].join('');
}

function insertSponsored(relative, anchor, block, marker) {
  const target = path.join(DIST, relative);
  if (!fs.existsSync(target)) throw new Error('Affiliate target page not found: ' + relative);
  const html = fs.readFileSync(target, 'utf8');
  if (html.includes(marker)) return false;
  if (!html.includes(anchor)) throw new Error('Affiliate placement missing in ' + relative);
  fs.writeFileSync(target, html.replace(anchor, block + anchor));
  return true;
}

const collection = [
  '<section class="section life-sponsor-collection" data-offer-group="three-life-offers-2026" aria-labelledby="life-sponsor-title">',
  '<div class="section-header"><div><h2 id="life-sponsor-title">생활 제휴 정보</h2>',
  '<p>아래는 광고·제휴 콘텐츠입니다. 링크를 통한 성과에 따라 운영자에게 수익이 발생할 수 있습니다.</p></div></div>',
  '<div class="life-sponsor-grid">',
  ...additionalCampaigns.map((campaign) => supplementalCard(campaign, { withNotice: false })),
  '</div></section>',
].join('');

let additionalUpdated = 0;
if (insertSponsored('index.html', '<section class="section life-archive"',
  collection, 'data-offer-group="three-life-offers-2026"')) additionalUpdated++;

// Education is relevant to child/parenting guides; avoid indiscriminate insertion
// into unrelated government benefit, automobile, or paginated reading pages.
for (const slug of ['child-allowance-2026', 'childcare-service-government-support-2026']) {
  if (insertSponsored('support/' + slug + '/index.html', '<div class="disclaimer">',
    supplementalCard(additionalCampaigns[2]),
    'data-affiliate="tenping-elementary-education-2026"')) additionalUpdated++;
}

console.log('[affiliate] Three additional Tenping campaigns on homepage; contextual education ad on 2 guides; updated ' + additionalUpdated + ' page(s).');
