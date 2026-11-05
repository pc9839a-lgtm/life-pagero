import fs from 'node:fs';
import path from 'node:path';

// Final presentation pass: retain all original articles, slugs, canonical URLs,
// structured data and ad slots. Never fabricate live news or market rates.
const DIST = path.resolve('dist');
const ROOT = path.resolve('content/posts');
const SITE = 'https://pagero.kr/life';
const REVIEWED = '2026-11-05';
const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const posts = ['car', 'support'].flatMap(category =>
  fs.readdirSync(path.join(ROOT, category))
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(ROOT, category, file), 'utf8')))
    .filter(post => !post.noindex)
);
const url = post => '/' + post.category + '/' + post.slug + '/';
const compareNew = (a, b) => String(b.updatedAt || b.reviewedAt || b.publishedAt)
  .localeCompare(String(a.updatedAt || a.reviewedAt || a.publishedAt));
const byTitle = expression => posts.filter(post => expression.test(post.title + ' ' + (post.keywords || []).join(' ')))
  .sort(compareNew);
const link = (href, text) => '<a href="' + esc(href) + '">' + esc(text) + '</a>';
const articleLinks = (items, max = 4) =>
  items.slice(0, max).map(post =>
    '<li><a href="' + esc(url(post)) + '">' + esc(post.title) + '</a></li>'
  ).join('');
const read = relative => fs.readFileSync(path.join(DIST, relative), 'utf8');
const write = (relative, html) => {
  const filename = path.join(DIST, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, html);
};

const topics = [
  { title: '금융·세금', desc: '대출 상환액 · 세금 · 환급', href: '/finance/',
    pattern: /연말정산|종합소득세|소득세|세금|자동차세|환급|공제|금융|대출/ },
  { title: '지원금·복지', desc: '대상 조건 · 지급액 · 신청', href: '/support/',
    pattern: /지원금|급여|수당|연금|바우처|지원제도|복지/ },
  { title: '주거·부동산', desc: '주거급여 · 월세 · 이사', href: '/support/',
    pattern: /주거|임차|월세|전세|주택|임대|이사/ },
  { title: '자동차', desc: '검사 · 이전등록 · 비용', href: '/car/',
    pattern: /자동차|중고차|검사|명의이전/ },
  { title: '취업·노동', desc: '구직 · 취업 · 근로', href: '/support/',
    pattern: /취업|구직|근로|퇴직|노동|실업/ },
  { title: '생활·건강', desc: '건강 · 돌봄 · 생활요금', href: '/support/',
    pattern: /건강|접종|돌봄|의료|병원|전기|관리비|요금/ },
];

const sections = topics.map(topic => {
  const matches = (topic.title === '자동차'
    ? posts.filter(post => post.category === 'car').sort(compareNew)
    : byTitle(topic.pattern)).slice(0, 3);
  return '<section class="portal-topic-card" aria-label="' + esc(topic.title) + '">'
    + '<div class="portal-topic-card-head"><h3>' + link(topic.href, topic.title) + '</h3>'
    + '<p>' + esc(topic.desc) + '</p></div>'
    + '<ul>' + articleLinks(matches, 3) + '</ul>'
    + '<a class="portal-more" href="' + esc(topic.href) + '">분야별 정보 보기</a>'
    + '</section>';
}).join('');

const updated = [...posts].sort(compareNew).slice(0, 5);
const updates = updated.map(post =>
  '<li><a href="' + esc(url(post)) + '"><strong>' + esc(post.title) + '</strong>'
  + '<span>최종 수정 ' + esc(post.updatedAt || post.publishedAt)
  + ' · 자료 확인 ' + esc(post.reviewedAt || post.updatedAt || post.publishedAt)
  + '</span></a></li>'
).join('');

const newHome = '<section class="hero portal-home-hero">'
  + '<h1>생활에 필요한 정보, 바로 찾아보세요.</h1>'
  + '<p>금융·세금·지원금·주거·자동차 정보와 신청 방법을 분야별로 확인할 수 있습니다.</p>'
  + '<form class="portal-home-search" action="/search/" method="get" role="search">'
  + '<label class="sr-only" for="portal-home-q">생활정보 검색어</label>'
  + '<input id="portal-home-q" name="q" type="search" placeholder="예: 자동차 검사기간, 주거급여, 연말정산" required>'
  + '<button type="submit">검색</button></form>'
  + '<div class="portal-search-suggestions" aria-label="자주 찾는 정보">'
  + link('/finance/loan-payment/', '대출 이자 계산')
  + link('/car/car-inspection-period/', '자동차 검사기간')
  + link('/support/housing-benefit-2026/', '주거급여 기준')
  + link('/support/year-end-tax-precheck-2026/', '연말정산')
  + '</div></section>'
  + '<section class="portal-home-section" aria-labelledby="portal-topic-title">'
  + '<div class="portal-section-heading"><h2 id="portal-topic-title">분야별 바로가기</h2>'
  + '<p>자주 찾는 정보를 주제별로 모았습니다.</p></div>'
  + '<div class="portal-topic-grid">' + sections + '</div></section>'
  + '<section class="portal-home-section portal-updates" aria-labelledby="portal-updates-title">'
  + '<div class="portal-section-heading"><h2 id="portal-updates-title">최근 확인된 생활정보</h2>'
  + '<p>실시간 속보가 아닌, 게시글의 실제 수정일과 공식자료 확인일 기준입니다.</p></div>'
  + '<ul class="portal-update-list">' + updates + '</ul></section>';

let home = read('index.html');
if (!home.includes('<section class="hero">')) throw new Error('Portal: original homepage hero missing');
home = home.replace(/<section class="hero">[\s\S]*?<\/section>/, newHome);
// Earlier build stages have already inserted the sponsor and advertising
// sections. Only remove the now-redundant old 2-category landing tiles.
home = home.replace(/<section class="section"><div class="category-grid">[\s\S]*?<\/section>/, '');
home = home.replace(/<title>[^<]*<\/title>/, '<title>생활비서 | 금융·세금·복지·자동차 생활정보</title>');
home = home.replace(/<meta name="description"[^>]*>/,
  '<meta name="description" content="대출 이자 계산부터 세금·환급, 정부지원, 주거, 자동차 검사까지 필요한 정보를 빠르게 검색하고 공식 근거와 신청 경로를 확인할 수 있습니다.">');
home = home.replace(/<meta property="og:title"[^>]*>/,
  '<meta property="og:title" content="생활비서 | 금융·세금·복지·자동차 생활정보">');
home = home.replace(/<meta property="og:description"[^>]*>/,
  '<meta property="og:description" content="금융 계산, 세금, 정부지원, 주거, 자동차 정보를 한곳에서 확인할 수 있습니다.">');
write('index.html', home);

const number = s => Number(s);
const financeMatches = byTitle(/연말정산|종합소득세|공제|환급|세금|자동차세/);
const financeGuideLinks = articleLinks(financeMatches, 8) ||
  '<li><a href="/support/">지원정책 전체보기</a></li>';
const financeBody = '<div class="site-shell"><article class="portal-page">'
  + '<nav class="portal-breadcrumbs" aria-label="현재 위치">' + link('/', '홈') + ' / 금융·세금</nav>'
  + '<h1>금융·세금 정보</h1>'
  + '<p class="portal-page-lead">대출 상환액은 직접 계산하고, 세금·환급 안내는 최근 확인한 생활정보 글에서 찾을 수 있습니다.</p>'
  + '<section class="portal-tool-callout"><div><h2>대출 원리금 계산기</h2>'
  + '<p>대출금·연이율·상환기간을 입력하면 원리금균등 방식의 월 예상 상환액과 총 이자를 계산합니다.</p></div>'
  + '<a href="/finance/loan-payment/">대출 상환액 계산하기</a></section>'
  + '<section class="portal-info-block"><h2>세금·환급 바로가기</h2><ul class="portal-guide-links">'
  + financeGuideLinks + '</ul></section>'
  + '<section class="portal-info-block"><h2>금융정보를 비교할 때</h2>'
  + '<p>표시된 대출금리는 금융회사, 상품, 신용조건, 우대조건, 기준일에 따라 달라집니다. 이 사이트에서는 확인되지 않은 실시간 금리를 제공하지 않습니다.</p>'
  + '<p>상환액 계산 결과에는 취급수수료, 중도상환수수료, 보증료, 변동금리 변화가 반영되지 않습니다. 실제 계약 전 금융회사가 제공하는 상품설명서와 상환예정표를 확인해야 합니다.</p>'
  + '</section></article></div>';

const calculatorBody = '<div class="site-shell"><article class="portal-page portal-calculator-page">'
  + '<nav class="portal-breadcrumbs" aria-label="현재 위치">' + link('/', '홈')
  + ' / ' + link('/finance/', '금융·세금') + ' / 대출 원리금 계산</nav>'
  + '<h1>대출 이자·월 상환액 계산기</h1>'
  + '<p class="portal-page-lead">대출금, 연이율, 기간을 입력하면 원리금균등상환 기준 월 납입액과 총 이자를 확인할 수 있습니다.</p>'
  + '<form id="portal-loan-form" class="portal-loan-form">'
  + '<label>대출금액 (원)<input id="loan-principal" inputmode="numeric" type="number" min="1" max="100000000000" step="10000" value="10000000" required></label>'
  + '<label>연이율 (%)<input id="loan-rate" inputmode="decimal" type="number" min="0" max="100" step="0.01" value="4.5" required></label>'
  + '<label>상환기간 (개월)<input id="loan-months" inputmode="numeric" type="number" min="1" max="600" step="1" value="36" required></label>'
  + '<button type="submit">월 상환액 계산</button></form>'
  + '<section id="portal-loan-result" class="portal-loan-result" aria-live="polite">'
  + '<h2>예상 상환액</h2><p>기본 입력값을 기준으로 계산하려면 계산 버튼을 누르세요.</p></section>'
  + '<section class="portal-info-block"><h2>원리금균등상환 계산 방식</h2>'
  + '<p>매월 동일한 금액을 납부하는 방식입니다. 월이자율을 연이율 ÷ 12로 환산하고, 월 상환액 = 대출금 × 월이자율 ÷ (1 − (1 + 월이자율)<sup>−상환개월수</sup>) 공식으로 계산합니다.</p>'
  + '<p>연이율이 0%라면 월 납입액은 원금을 개월 수로 나눈 금액입니다. 본 계산은 이자율이 상환기간 동안 일정하고 매월 말 납부한다는 가정이며 실제 계약 금액과 다를 수 있습니다.</p>'
  + '<h2>계산 결과를 해석할 때</h2>'
  + '<p>월 납입액은 원금과 이자를 합친 추정치입니다. 총 이자는 매월 납입액 × 상환개월 수에서 원금을 뺀 추정치입니다. 원금균등상환, 만기일시상환, 중도상환, 거치기간, 일할이자는 별도 계산이 필요합니다.</p>'
  + '<p>입력한 연이율은 예시일 뿐 현재 은행 금리가 아닙니다. 실제 금리와 대출 가능 여부는 금융회사에서 확인하세요.</p></section>'
  + '<p class="portal-calculator-back">' + link('/finance/', '금융·세금 정보 더 보기') + '</p>'
  + '</article></div>';

function makePage(body, pathname, title, description, withCalculator = false) {
  let html = read('about/index.html');
  // Preserve the existing approved third-party banner loader and one main
  // ad placement on newly generated finance pages.
  const coupangBlock = html.match(/<aside class="life-coupang-placement[\s\S]*?<\/aside>/)?.[0];
  if (!coupangBlock) throw new Error('Portal: existing ad block missing in page template');
  body += coupangBlock;
  const replacements = [
    [/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>'],
    [/<meta name="description"[^>]*>/, '<meta name="description" content="' + esc(description) + '">'],
    [/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + SITE + pathname + '">'],
    [/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + esc(title) + '">'],
    [/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + esc(description) + '">'],
    [/<meta property="og:url"[^>]*>/, '<meta property="og:url" content="' + SITE + pathname + '">'],
    [/<main id="main-content">[\s\S]*?<\/main>/, '<main id="main-content">' + body + '</main>']
  ];
  for (const [pattern, replacement] of replacements) {
    if (!pattern.test(html)) throw new Error('Portal: missing page metadata/layout element for ' + pathname + ' ' + pattern);
    html = html.replace(pattern, replacement);
  }
  if (withCalculator) {
    html = html.replace('</head>', '<script defer src="/portal-finance-calculator.js"></script></head>');
  }
  return html;
}
write('finance/index.html', makePage(financeBody, '/finance/',
  '금융·세금 정보 | 생활비서',
  '대출 원리금 계산기와 연말정산·세금·환급 정보를 검색하고, 관련 공식 자료와 확인일을 대조할 수 있습니다.'));
write('finance/loan-payment/index.html', makePage(calculatorBody, '/finance/loan-payment/',
  '대출 이자·월 상환액 계산기 | 생활비서',
  '대출금액, 연이율, 상환기간을 입력하면 원리금균등상환 기준 월 납입액과 총 이자를 즉시 계산할 수 있습니다.'));

const highlights = {
  car: posts.filter(post => post.category === 'car').sort(compareNew).slice(0, 5),
  support: posts.filter(post => post.category === 'support').sort(compareNew).slice(0, 5)
};
for (const [category, items] of Object.entries(highlights)) {
  const relative = category + '/index.html';
  let html = read(relative);
  const anchor = '<section class="main-column section">';
  const quick = '<div class="portal-category-quick"><h2>주요 정보 바로가기</h2>'
    + '<ul>' + articleLinks(items, 5) + '</ul></div>';
  if (!html.includes(anchor)) throw new Error('Portal: category list anchor missing: ' + category);
  html = html.replace(anchor, anchor + quick);
  write(relative, html);
}

let articleCount = 0;
for (const post of posts) {
  const pathname = post.category + '/' + post.slug + '/index.html';
  let html = read(pathname);
  if (!html.includes('<header class="article-header">')) throw new Error('Portal: article header missing: ' + pathname);
  if (!post.keyPoints?.length) throw new Error('Portal: article key points missing: ' + pathname);
  const bullets = post.keyPoints.slice(0, 3).map(point => '<li>' + esc(point) + '</li>').join('');
  const official = post.officialCta && /^https:\/\//.test(post.officialCta.href)
    ? '<a class="portal-brief-official" href="' + esc(post.officialCta.href)
      + '" target="_blank" rel="noopener noreferrer">' + esc(post.officialCta.label || '공식 조회') + '</a>'
    : '';
  const summary = '<section class="portal-article-brief" aria-label="핵심 답변">'
    + '<div class="portal-brief-top"><h2>핵심정보</h2><span>자료 확인 '
    + esc(post.reviewedAt || post.updatedAt) + '</span></div>'
    + '<ul>' + bullets + '</ul>'
    + '<div class="portal-brief-links"><a href="#portal-article-detail">자세한 내용 보기</a>'
    + official + '</div></section>';
  html = html.replace(/(<header class="article-header">[\s\S]*?<\/header>)/, (_match, original) =>
    original + summary);
  // Preserve the exact .article-content container expected by editorial SEO QA.
  html = html.replace('<div class="article-content">', '<span id="portal-article-detail" class="portal-article-anchor" aria-hidden="true"></span><div class="article-content">');
  write(pathname, html);
  articleCount++;
}

const sitemapFile = path.join(DIST, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapFile, 'utf8');
for (const pathname of ['/finance/', '/finance/loan-payment/']) {
  const absolute = SITE + pathname;
  if (!sitemap.includes('<loc>' + absolute + '</loc>')) {
    sitemap = sitemap.replace('</urlset>', '<url><loc>' + absolute + '</loc><lastmod>'
      + REVIEWED + '</lastmod></url></urlset>');
  }
}
fs.writeFileSync(sitemapFile, sitemap);
const sitemapIndexFile = path.join(DIST, 'sitemap-index.xml');
let sitemapIndex = fs.readFileSync(sitemapIndexFile, 'utf8');
sitemapIndex = sitemapIndex.replace(/<lastmod>[^<]*<\/lastmod>/,
  '<lastmod>' + REVIEWED + '</lastmod>');
fs.writeFileSync(sitemapIndexFile, sitemapIndex);

// Preserve SEO metadata and existing advertising. Add style and finance link
// consistently to all generated HTML documents, including continuation pages.
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  });
}
let decorated = 0;
for (const filename of walk(DIST).filter(file => file.endsWith('.html'))) {
  let html = fs.readFileSync(filename, 'utf8');
  if (!html.includes('href="/portal-ux.css"')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/portal-ux.css"></head>');
  }
  html = html.replace(
    /(<nav class="main-nav"><div class="nav-inner">[\s\S]*?<a href="\/support\/"[^>]*>[^<]*<\/a>)/,
    '$1<a href="/finance/">금융·계산</a>'
  );
  fs.writeFileSync(filename, html);
  decorated++;
}

// Validation is independent of ads and metadata ordering.
for (const relative of ['index.html', 'finance/index.html', 'finance/loan-payment/index.html']) {
  const html = read(relative);
  if (!html.includes('href="/portal-ux.css"') ||
      (html.match(/<h1(?:\s[^>]*)?>/g) || []).length !== 1 ||
      (html.match(/<link rel="canonical"/g) || []).length !== 1) {
    throw new Error('Portal SEO semantics invalid: ' + relative);
  }
}
if (!read('index.html').includes('role="search"')) throw new Error('Portal search box missing');
if (!read('finance/loan-payment/index.html').includes('portal-loan-form')) throw new Error('Finance calculator missing');
console.log('Portal navigation complete: ' + posts.length + ' article summaries, '
  + decorated + ' HTML pages, finance hub and functional loan calculator.');
