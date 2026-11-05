import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const CONTENT = path.resolve('content/posts');
const campaigns = {
  auto: {
    id: 'tenping-auto-lease-202610',
    href: 'https://iryan.kr/t8hckabtgd',
    image: 'https://img.tenping.kr/Content/Upload/Images/2026100118010001_Dis_20261001180129.png',
    title: 'AI로 신차 장기렌트·리스 견적 비교하고, 상담부터 출고까지',
    action: '상담 신청하기',
  },
  device: {
    id: 'tenping-pon-gabi-2026',
    href: 'https://iryan.kr/t8hckab8vo',
    image: 'https://img.tenping.kr/Content/Upload/Images/2026073016260001_Dis_20260923152711.png',
    title: 'S급 중고 디바이스 최저가구매, 폰가비',
    action: '상담 신청하기',
  },
  mbti: {
    id: 'tenping-mbti-relationship-2026',
    href: 'https://iryan.kr/t8hckab8vp',
    image: 'https://img.tenping.kr/Content/Upload/Images/2025120422540001_Dis_20251205102648.jpg',
    title: '내 MBTI와 딱 맞는 사람은 어딨을까? 연애스타일 테스트해보기',
    action: '상담 신청하기',
  },
  education: {
    id: 'tenping-elementary-education-2026',
    href: 'https://iryan.kr/t8hckacv03',
    image: 'https://img.tenping.kr/Content/Upload/Images/2019122614580001_Dis_20251201182937.jpg',
    title: "전 과목 스타 선생님+영수 심화+영재교육원까지! 초등 인강 '엘리하이'",
    action: '상담 신청하기',
  },
};

const esc = (value) => String(value).replace(/[&<>"']/g, (ch) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function card(campaign) {
  const href = esc(campaign.href), title = esc(campaign.title);
  return [
    '<aside class="life-affiliate" data-affiliate="' + esc(campaign.id) + '" aria-label="광고 및 제휴 콘텐츠">',
    '<p class="life-affiliate-label">광고 · 제휴</p>',
    '<a class="life-affiliate-image" href="' + href + '" target="_blank" rel="sponsored noopener noreferrer" aria-label="' + title + '">',
    '<img src="' + esc(campaign.image) + '" width="800" loading="lazy" decoding="async" alt="' + title + ' 광고">',
    '</a>',
    '<div class="life-affiliate-copy"><p class="life-affiliate-title">' + title + '</p>',
    '<a class="life-affiliate-action" href="' + href + '" target="_blank" rel="sponsored noopener noreferrer">' + esc(campaign.action) + ' <span aria-hidden="true">→</span></a></div>',
    '<p class="life-affiliate-notice">제휴 광고를 통한 성과에 따라 사이트 운영자에게 수익이 발생할 수 있습니다.</p>',
    '</aside>',
  ].join('');
}

function bannerSection(offers, title = '생활 제휴 정보', extraClass = '') {
  return [
    '<section class="section life-sponsor-collection ' + esc(extraClass) + '" data-offer-group="three-life-offers-2026" aria-label="' + esc(title) + '">',
    '<div class="section-header"><div><h2 id="life-sponsor-title">' + esc(title) + '</h2>',
    '<p>아래는 광고·제휴 콘텐츠입니다. 상품·서비스 조건은 각 광고주 페이지에서 확인하세요.</p></div></div>',
    '<div class="life-sponsor-grid">',
    ...offers.map(card),
    '</div></section>',
  ].join('');
}

function update(relative, transform) {
  const target = path.join(DIST, relative);
  if (!fs.existsSync(target)) throw new Error('Missing ad placement target: ' + relative);
  const previous = fs.readFileSync(target, 'utf8');
  if (previous.includes('data-life-affiliate-layout="wide-v2"')) return false;
  const next = transform(previous);
  if (next === previous) throw new Error('No ad placement changed in ' + relative);
  fs.writeFileSync(target, next);
  return true;
}

function placeBefore(html, anchor, fragment, page) {
  if (!html.includes(anchor)) throw new Error('Expected insertion anchor missing in ' + page);
  return html.replace(anchor, fragment + anchor);
}

const marker = '<span hidden data-life-affiliate-layout="wide-v2"></span>';
let homeCount = 0;
if (update('index.html', (html) => {
  const heroNext = '<section class="section"><div class="category-grid">';
  const top = '<div class="life-affiliate-placement life-affiliate-placement--top">' + card(campaigns.auto) + '</div>';
  const lower = bannerSection([campaigns.device, campaigns.mbti, campaigns.education]);
  const withTop = placeBefore(html, heroNext, top, 'homepage');
  const withLower = placeBefore(withTop, '<section class="section life-archive"', lower + marker, 'homepage');
  homeCount = 4;
  return withLower;
})) {}

for (const [category, offers] of [
  ['car', [campaigns.auto, campaigns.device]],
  ['support', [campaigns.education, campaigns.mbti]],
]) {
  update(category + '/index.html', (html) => {
    const block = bannerSection(offers, '관련 제휴 광고', 'life-sponsor-category') + marker;
    return placeBefore(html, '<section class="main-column section">', block, category);
  });
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const current = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(current) : [current];
  });
}

function chooseOffers(post) {
  if (post.category === 'car') return [campaigns.auto, campaigns.device];
  const parenting = /(child|parent|infant|baby|childcare|diaper|parental|education|first-meeting)/i.test(post.slug);
  if (parenting) return [campaigns.education, campaigns.device];
  return [campaigns.device, campaigns.mbti];
}

let articles = 0, articleUnits = 0;
for (const filename of walk(CONTENT).filter(name => name.endsWith('.json'))) {
  const post = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (post.noindex) continue;
  const relative = post.category + '/' + post.slug + '/index.html';
  const [primary, secondary] = chooseOffers(post);
  update(relative, html => {
    const summary = /<section class="key-summary">[\s\S]*?<\/section>/g;
    const matches = [...html.matchAll(summary)];
    if (!matches.length) throw new Error('Missing article summary: ' + relative);

    const blocks = [
      '<div class="life-article-sponsor life-article-sponsor--early">' + card(primary) + '</div>',
      '<div class="life-article-sponsor life-article-sponsor--mid">' + card(secondary) + '</div>',
    ];
    // Display a large, visibly labelled offer soon after the first summary,
    // and a second distinct offer after the next section. Never cover the article.
    if (matches.length >= 2) {
      const second = matches[1];
      html = html.slice(0, second.index + second[0].length) + blocks[1] + html.slice(second.index + second[0].length);
    } else {
      html = placeBefore(html, '<div class="disclaimer">', blocks[1], relative);
    }
    const first = html.match(summary);
    if (!first) throw new Error('First summary missing after insertion: ' + relative);
    return html.replace(first[0], first[0] + blocks[0] + marker);
  });
  articles++;
  articleUnits += 2;
}

// Every first article page receives two distinct sponsored placements.
// Continuation pages are deliberately left alone to avoid repetitive ads.
// Verify campaign hrefs, disclosure, and wide layout markers in output.
for (const relative of ['index.html', 'car/index.html', 'support/index.html']) {
  const html = fs.readFileSync(path.join(DIST, relative), 'utf8');
  if (!html.includes('data-life-affiliate-layout="wide-v2"')) throw new Error('Missing wide ad marker: ' + relative);
}
const homeHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
for (const campaign of Object.values(campaigns)) {
  if (!homeHtml.includes('data-affiliate="' + campaign.id + '"')
      || !homeHtml.includes('href="' + campaign.href + '"')) {
    throw new Error('Missing homepage campaign: ' + campaign.id);
  }
}
console.log('[affiliate] Wide banners: homepage ' + homeCount + ', category pages 2, articles ' + articles + ', article units ' + articleUnits);
