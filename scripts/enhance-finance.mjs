import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DIST=path.resolve('dist');
const FINANCE_JS='/finance-live.js';
const FINANCE_JS_HASH=createHash('sha256').update(fs.readFileSync(path.join(DIST,FINANCE_JS.slice(1)))).digest('hex').slice(0,12);
const FINANCE_JS_HREF=FINANCE_JS+'?v='+FINANCE_JS_HASH;
const SITE='https://pagero.kr/life';
const LAST_REVIEW='2026-11-05'; // creation date, not an automatic freshness claim
const esc = value => String(value||'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const read = name => fs.readFileSync(path.join(DIST,name),'utf8');
const write = (name,html) => {
  const file=path.join(DIST,name);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,html);
};
const main = content => '<main id="main-content"><div class="site-shell"><article class="portal-page finance-page">'
  + content + '</article></div></main>';
const breadcrumb = (parent='') => '<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / '
  +(parent?'<a href="/finance/">금융정보</a> / '+esc(parent):'금융정보')+'</nav>';
const official = '<a href="https://finlife.fss.or.kr/" target="_blank" rel="noopener noreferrer">금융감독원 금융상품한눈에</a>';
const pageLink = (href,name,desc) => '<a class="finance-hub-card" href="'+href+'"><strong>'
  +esc(name)+'</strong><span>'+esc(desc)+'</span></a>';
// Keep one working official destination visible. Interactive tables appear only
// after an authenticated source actually supplies rows; never show diagnostics.
const ratesShortcut = '<div class="finance-official-shortcut" id="finance-rates-official">'
  +'<a href="https://finlife.fss.or.kr/" target="_blank" rel="noopener noreferrer">'
  +'금융감독원에서 예·적금 금리 비교 <span aria-hidden="true">↗</span></a></div>';
function bankPanel(compact=false) {
  if(compact) return '<section class="finance-preview-section" aria-labelledby="finance-preview-heading">'
    +'<div class="finance-section-title"><h2 id="finance-preview-heading">예·적금 금리</h2>'
    +'<a href="/finance/savings/">전체 비교 보기 ›</a></div>'
    +ratesShortcut
    +'<div class="finance-rate-preview" id="finance-rate-preview" hidden></div></section>';
  return ratesShortcut
    +'<section class="finance-data-section" id="finance-rate-panel" aria-labelledby="bank-rates-heading" hidden>'
    +'<div class="finance-section-title"><div><h2 id="bank-rates-heading">은행별 예금·적금</h2></div></div>'
    +'<div class="finance-filter-bar">'
    +'<label>상품<select id="finance-kind"><option value="deposit">정기예금</option><option value="saving">적금</option></select></label>'
    +'<label>금융권<select id="finance-group"><option value="bank">은행</option><option value="savingsbank">저축은행</option></select></label>'
    +'<label>기간<select id="finance-term"><option value="12">12개월</option><option value="6">6개월</option><option value="24">24개월</option><option value="36">36개월</option><option value="all">전체</option></select></label>'
    +'<label>정렬<select id="finance-sort"><option value="base">기본금리 높은 순</option><option value="max">최고 우대금리 높은 순</option></select></label>'
    +'<label class="finance-filter-query">금융회사·상품명 검색<input type="search" id="finance-query" autocomplete="off" placeholder="은행·상품명"></label>'
    +'</div><div class="finance-source-bar"><span id="finance-product-criteria"></span>'
    +'<span id="finance-products-source"></span></div>'
    +'<div id="finance-products"></div>'
    +'<div class="finance-official-inline"><a href="https://finlife.fss.or.kr/" target="_blank" rel="noopener noreferrer">공식 공시 원문 ↗</a></div>'
    +'</section>';
}
function issuePanel() {
  return '<div class="finance-official-shortcut finance-official-shortcut--issues" id="finance-issues-official">'
    +'<a href="https://dart.fss.or.kr/" target="_blank" rel="noopener noreferrer">기업 공시 <span aria-hidden="true">↗</span></a>'
    +'<a href="https://www.bok.or.kr/" target="_blank" rel="noopener noreferrer">한국은행 발표 <span aria-hidden="true">↗</span></a></div>'
    +'<section class="finance-data-section" id="finance-issues-panel" aria-labelledby="issues-heading" hidden>'
    +'<div class="finance-section-title"><h2 id="issues-heading">최근 공식 발표</h2></div>'
    +'<div class="finance-issue-filters"><label>구분 <select id="finance-issues-type">'
    +'<option value="all">전체</option><option value="stock">기업 공시</option>'
    +'<option value="policy">금융·경제</option></select></label></div>'
    +'<div id="finance-issues"></div></section>';
}

const financeIndexLink=(href,title,description,kind='service')=>
  '<a class="finance-index-tile finance-index-tile--'+kind+'" href="'+href+'">'
  +'<strong>'+esc(title)+'</strong><span>'+esc(description)+'</span>'
  +'<span class="finance-index-tile-arrow" aria-hidden="true">↗</span></a>';
const hub = breadcrumb()
  +'<div class="finance-index">'
  +'<header class="finance-index-hero">'
  +'<p class="finance-index-eyebrow">생활비서 금융</p>'
  +'<h1>금융정보</h1>'
  +'<p class="finance-index-lead">예·적금 금리부터 대출 계산, 기업 공시까지 필요한 금융정보를 바로 확인하세요.</p>'
  +'<a class="finance-index-primary" href="#finance-index-services">금융 서비스 살펴보기 <span aria-hidden="true">↓</span></a>'
  +'</header>'
  +'<section class="finance-index-section" id="finance-index-services" aria-labelledby="finance-index-services-title">'
  +'<div class="finance-index-section-heading"><h2 id="finance-index-services-title">필요한 금융정보 찾기</h2>'
  +'<p>금리와 공시를 확인하고 생활에 필요한 세금 정보를 찾아보세요.</p></div>'
  +'<div class="finance-index-services">'
  +financeIndexLink('/finance/savings/','예·적금 금리 비교','기본금리·최고금리와 상품별 우대조건을 확인하세요.')
  +financeIndexLink('/finance/markets/','주식·기업 공시','기업 공시와 한국은행의 금융시장 발표를 살펴보세요.')
  +financeIndexLink('/support/year-end-tax-precheck-2026/','세금·환급 안내','연말정산 준비와 공제 항목을 확인하세요.')
  +'</div></section>'
  +'<section class="finance-index-section" aria-labelledby="finance-index-tools-title">'
  +'<div class="finance-index-section-heading"><h2 id="finance-index-tools-title">금융 계산기</h2>'
  +'<p>금액과 기간을 입력해 예상 이자와 상환액을 직접 계산할 수 있습니다.</p></div>'
  +'<div class="finance-index-tools">'
  +financeIndexLink('/finance/savings-calculator/','예·적금 이자 계산','목돈과 월 납입액에 따른 만기 이자를 계산합니다.','tool')
  +financeIndexLink('/finance/loan-payment/','대출 월 상환액','원리금균등·원금균등·만기일시상환을 비교합니다.','tool')
  +financeIndexLink('/finance/mortgage-calculator/','주택담보대출 계산','주택자금 대출의 월 납입액과 총이자를 확인합니다.','tool')
  +'</div></section>'
  +'<section class="finance-index-section finance-index-official" aria-labelledby="finance-index-official-title">'
  +'<div class="finance-index-section-heading"><h2 id="finance-index-official-title">공식 자료 바로가기</h2>'
  +'<p>금리와 공시는 금융회사 조건 및 발표 시점에 따라 달라집니다. 원문을 함께 확인하세요.</p></div>'
  +'<div class="finance-index-official-list">'
  +bankPanel(true)
  +issuePanel()
  +'</div></section>'
  +'<section class="finance-index-section finance-index-checks" aria-labelledby="finance-index-checks-title">'
  +'<div class="finance-index-section-heading"><h2 id="finance-index-checks-title">비교 전에 확인하세요</h2>'
  +'<p>금융정보를 판단할 때 놓치기 쉬운 기준입니다.</p></div>'
  +'<dl class="finance-index-check-list">'
  +'<div><dt>예·적금 금리</dt><dd>최고금리는 우대조건을 모두 충족해야 받을 수 있습니다. 가입기간·납입한도·중도해지 조건을 함께 비교하세요.</dd></div>'
  +'<div><dt>대출 상환액</dt><dd>계산기의 예상 금액에는 실제 금융회사의 수수료, 변동금리 및 약정별 이자 계산 차이가 반영되지 않을 수 있습니다.</dd></div>'
  +'<div><dt>시장·기업 공시</dt><dd>DART와 한국은행 발표의 공시일·기준일을 먼저 확인하세요. 발표 자료는 투자 수익을 보장하지 않습니다.</dd></div>'
  +'</dl></section>'
  +'</div>';

const savingsPage = breadcrumb('예금·적금 비교')
  +'<h1>예·적금 금리 확인</h1>'
  +'<p class="finance-page-intro">은행별 기본금리와 최고금리를 비교해 보세요.</p>'
  +bankPanel()
  +'<section class="finance-plain-guide"><h2>예금과 적금 중 무엇을 비교해야 하나요?</h2>'
  +'<p><strong>정기예금</strong>은 목돈을 한 번에 맡기는 방식이고, <strong>적금</strong>은 매월 납입해 모으는 방식입니다. 적금의 연이율을 목돈 예금의 연이율과 그대로 비교하면 실제 만기 이자를 과대평가할 수 있습니다. 정기예금은 원금 전체의 예치기간을, 적금은 각 회차 납입금의 예치기간을 따로 계산해야 합니다.</p>'
  +'<h2>기본금리와 최고금리의 차이</h2>'
  +'<p>기본금리는 별도 우대조건 없이 적용되는 공시 금리입니다. 최고금리는 상품이 정한 우대조건을 충족한 경우 가능한 금리로, 모든 가입자에게 보장되지 않습니다. 우대조건에 급여이체·입출금계좌·카드·앱 가입 등 추가 요건이 있는지 확인해야 합니다.</p>'
  +'<h2>가입 전에 확인할 항목</h2><ul>'
  +'<li>가입 가능한 금융회사와 상품 판매 여부</li>'
  +'<li>가입기간과 납입한도, 정액적립·자유적립 조건</li>'
  +'<li>우대금리 인정 기간, 중도해지 시 이율과 세금</li>'
  +'<li>예금자보호 여부와 보호 한도, 가입 채널</li></ul>'
  +'</section>';
const marketsPage = breadcrumb('주식·주요 이슈')
  +'<h1>주식시장 주요 이슈·기업 공시</h1>'
  +'<p class="finance-page-intro">주식 투자에 영향을 줄 수 있는 기업의 실적·배당·증자·자사주 관련 공시와 기준금리·금융정책 발표를 공식 출처로 확인합니다.</p>'
  +'<div class="finance-market-links">'
  +pageLink('https://data.krx.co.kr/','코스피·코스닥 지수','한국거래소 공식 데이터에서 지수 확인')
  +pageLink('https://dart.fss.or.kr/','기업별 전자공시','기업 실적·주요경영사항·자본변동 조회')
  +pageLink('https://www.bok.or.kr/','한국은행 발표','통화정책·경제통계·금융시장 자료')
  +'</div>'
  +issuePanel()
  +'<section class="finance-plain-guide"><h2>기업 공시에서 먼저 볼 항목</h2>'
  +'<p><strong>실적 공시</strong>는 매출·영업이익·순이익과 전년 동기 대비 변화를 확인하고, <strong>유상증자</strong>는 자금조달 목적과 신주 발행 규모, 기존 주식의 희석 가능성을 확인합니다. <strong>자사주 매입·소각</strong>은 실제 취득·소각 규모와 집행 기간을 구별해야 합니다.</p>'

  +'<h2>공시와 뉴스는 다릅니다</h2>'
  +'<p>DART 공시는 기업이 제출한 원문이고 한국은행·금융위원회 발표는 정책·시장 자료입니다. 언론사의 별도 취재 기사와 혼동하지 않아야 하며, 표제만으로 주식 매매를 결정해서는 안 됩니다.</p></section>';

const calculator = breadcrumb('대출 이자 계산기')
  +'<h1>대출 이자·월 상환액 계산기</h1>'
  +'<p class="finance-page-intro">원리금균등·원금균등·만기일시상환을 비교하고 첫 달 납입액, 총 이자, 월별 상환표를 확인합니다.</p>'
  +'<form id="portal-loan-form" class="loan-tool" novalidate>'
  +'<fieldset class="loan-methods"><legend>상환방식 선택</legend><div class="loan-method-grid">'
  +'<label data-method-value="equal-payment" class="loan-method-option is-active"><input type="radio" name="loan-method" value="equal-payment" checked><strong>원리금균등</strong><span>매달 비슷한 금액</span></label>'
  +'<label data-method-value="equal-principal" class="loan-method-option"><input type="radio" name="loan-method" value="equal-principal"><strong>원금균등</strong><span>초기에 많이, 점점 감소</span></label>'
  +'<label data-method-value="bullet" class="loan-method-option"><input type="radio" name="loan-method" value="bullet"><strong>만기일시</strong><span>이자만 내고 마지막에 원금</span></label>'
  +'</div></fieldset>'
  +'<div class="loan-entry-grid">'
  +'<div class="loan-input-block loan-input-money"><label for="loan-principal">대출금액 <small>원</small></label>'
  +'<input type="number" id="loan-principal" inputmode="numeric" min="1" max="100000000000" step="1" value="100000000" required>'
  +'<div class="loan-quick-values"><button type="button" data-field="loan-principal" data-fill="10000000">+1천만</button>'
  +'<button type="button" data-field="loan-principal" data-fill="50000000">+5천만</button>'
  +'<button type="button" data-field="loan-principal" data-fill="100000000">+1억</button></div></div>'
  +'<div class="loan-input-block"><label for="loan-rate">연이율 <small>%</small></label>'
  +'<input type="number" id="loan-rate" inputmode="decimal" min="0" max="100" step="0.01" value="4.5" required></div>'
  +'<div class="loan-input-block"><label for="loan-months">상환기간 <small>개월</small></label>'
  +'<input type="number" id="loan-months" inputmode="numeric" min="1" max="600" step="1" value="360" required>'
  +'<div class="loan-input-note">360개월 = 30년</div></div>'
  +'<div class="loan-input-block"><label for="loan-grace">거치기간 <small>개월</small></label>'
  +'<input type="number" id="loan-grace" inputmode="numeric" min="0" max="599" step="1" value="0" required>'
  +'<div class="loan-input-note">거치 중 이자만 납부 · 만기일시는 별도 적용하지 않음</div></div>'
  +'<div class="loan-input-block"><label for="loan-extra">매월 추가 원금상환 <small>원</small></label>'
  +'<input type="number" id="loan-extra" inputmode="numeric" min="0" max="100000000000" step="1" value="0" required>'
  +'<div class="loan-input-note">중도상환수수료 미포함 · 거치 중에도 적용</div></div>'
  +'</div><button class="loan-calc-button" type="submit">상환액 다시 계산</button></form>'
  +'<section class="loan-result-area" aria-live="polite" id="portal-loan-result"><h2>계산 결과</h2></section>'
  +'<section class="loan-result-details"><h2>상환방식별 비교</h2>'
  +'<p>동일한 금액·금리·기간·거치·추가상환 조건으로 비교한 예상 결과입니다.</p>'
  +'<div class="finance-table-scroll"><table class="finance-rate-table loan-comparison-table"><thead>'
  +'<tr><th scope="col">상환방식</th><th scope="col">첫 달 납입</th><th scope="col">총 이자</th><th scope="col">상환 기간</th></tr>'
  +'</thead><tbody id="loan-method-comparison"></tbody></table></div></section>'
  +'<section class="loan-result-details"><div class="finance-section-title"><div><h2>월별 상환표</h2>'
  +'<p>월 납입액의 원금·이자 구성과 남은 대출잔액을 회차별로 비교할 수 있습니다.</p></div>'
  +'<button type="button" id="loan-export" disabled>CSV 내려받기</button></div>'
  +'<div class="finance-table-scroll"><table class="finance-rate-table loan-schedule-table"><thead>'
  +'<tr><th scope="col">회차</th><th scope="col">월 납입액</th><th scope="col">원금</th>'
  +'<th scope="col">이자</th><th scope="col">남은 원금</th></tr></thead>'
  +'<tbody id="loan-schedule-table"></tbody></table></div>'
  +'<button type="button" id="loan-schedule-toggle" class="loan-toggle" hidden>전체 보기</button></section>'
  +'<section class="finance-plain-guide"><h2>계산할 때 알아둘 점</h2>'
  +'<p>이 계산기는 입력한 연이율을 월이자율로 환산하고 월말 납입을 가정합니다. 거치기간을 선택하면 그 기간에는 이자만 납부하며, 나머지 상환기간에 원금을 상환합니다. 만기일시상환은 마지막 회차에 남은 원금을 납부합니다.</p>'
  +'<p>상환 예정액은 원 단위 반올림과 금융회사별 일할이자, 금리 변경, 수수료, 실제 약정일정에 따라 달라질 수 있습니다. 매월 추가상환은 잔액을 줄이는 단순 시뮬레이션으로, 조기상환수수료와 중도상환 규정은 포함하지 않습니다.</p>'
  +'<p><strong>주의:</strong> 이 화면의 연 4.5%는 예시 입력값이며 실제 은행 상품의 현재 금리가 아닙니다. 대출 실행 전 금융회사의 최신 상품설명서와 상환예정표를 확인하세요.</p>'
  +'<p><a href="/finance/">금융정보로 돌아가기</a></p></section>';

function page(html,pathname,title,description,body,script=false){
  const newSchema={
    '@context':'https://schema.org','@type':pathname.includes('loan-payment')?'WebPage':'CollectionPage',
    name:title,description,url:SITE+pathname,inLanguage:'ko',
    isPartOf:{'@type':'WebSite',name:'생활비서',url:SITE+'/'},
    datePublished:LAST_REVIEW
  };
  html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+esc(title)+'</title>');
  html=html.replace(/<meta name="description"[^>]*>/i,
    '<meta name="description" content="'+esc(description)+'">');
  html=html.replace(/<link rel="canonical"[^>]*>/i,
    '<link rel="canonical" href="'+SITE+pathname+'">');
  html=html.replace(/<meta property="og:title"[^>]*>/i,
    '<meta property="og:title" content="'+esc(title)+'">');
  html=html.replace(/<meta property="og:description"[^>]*>/i,
    '<meta property="og:description" content="'+esc(description)+'">');
  html=html.replace(/<meta property="og:url"[^>]*>/i,
    '<meta property="og:url" content="'+SITE+pathname+'">');
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'');
  html=html.replace('</head>','<script type="application/ld+json">'
    +JSON.stringify(newSchema).replace(/</g,'\\u003c')+'</script></head>');
  const sponsor=html.match(/<aside class="life-coupang-placement[\s\S]*?<\/aside>/)?.[0]||'';
  html=html.replace(/<main id="main-content">[\s\S]*?<\/main>/,
    main(body)+ (sponsor?'<div class="finance-sponsored">'+sponsor+'</div>':''));
  html=html.replace(/<script defer src="\/portal-finance-calculator\.js"><\/script>/gi,'');
  if(script==='calculator')html=html.replace('</head>',
    '<script type="module" src="/portal-finance-calculator.js"></script></head>');
  if(script==='live')html=html.replace('</head>',
    '<script defer src="'+FINANCE_JS_HREF+'"></script></head>');
  if(!html.includes('href="/finance-experience.css"'))
    html=html.replace('</head>',
      '<link rel="stylesheet" href="/finance-experience.css"></head>');
  return html;
}
const template=read('finance/index.html');
const oldCalc=read('finance/loan-payment/index.html');
const configurations=[
  ['finance/index.html','/finance/','금융정보 | 은행별 예적금·주식·경제 이슈 | 생활비서',
    '예금·적금 공식 비교공시, 기업 공시 조회, 대출 계산과 세금 정보를 확인할 수 있습니다.',hub,'live',template],
  ['finance/savings/index.html','/finance/savings/','예·적금 금리 확인 | 생활비서',
    '금융감독원 예금·적금 기본금리·최고금리 비교 및 상품별 우대조건 확인.',savingsPage,'live',template],
  ['finance/markets/index.html','/finance/markets/','주식시장 주요 이슈·기업 공시 | 생활비서',
    '최근 기업 공시, 주식시장 주요 공시, 한국은행 금융시장 발표와 금융정책 이슈를 출처·발표일과 함께 확인합니다.',marketsPage,'live',template],
  ['finance/loan-payment/index.html','/finance/loan-payment/','대출이자 계산기 | 원리금균등·원금균등·만기일시 | 생활비서',
    '대출금액·연이율·기간·거치·추가상환 조건으로 월 상환액과 총 이자를 계산하고 3가지 상환방식, 월별 원금·이자표를 비교합니다.',calculator,'calculator',oldCalc]
];
for(const [filename,pathname,title,description,body,script,source] of configurations){
 const html=page(source,pathname,title,description,body,script);
 if(!html.includes('<h1>') || (html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)
  throw new Error('Finance pages require one meaningful H1: '+filename);
 write(filename,html);
}
let home=read('index.html');
// The portal title and search snippet must reflect the actual banking and
// market functions; preserve a single self-canonical and existing site schema.
home=home.replace(/<title>[^<]*<\/title>/i,
 '<title>생활비서 | 지원금·자동차·주거·금융 정보</title>');
home=home.replace(/<meta name="description"[^>]*>/i,
 '<meta name="description" content="예금·적금 공식 비교공시 바로가기, 주식·경제 이슈, 세금·복지·자동차 생활정보를 확인하세요.">');
home=home.replace(/<meta property="og:title"[^>]*>/i,
 '<meta property="og:title" content="생활비서 | 지원금·자동차·주거·금융 정보">');
home=home.replace(/<meta property="og:description"[^>]*>/i,
 '<meta property="og:description" content="지원금, 자동차, 주거, 금융 생활정보를 분야별로 찾을 수 있습니다.">');
home=home.replace('예: 자동차 검사기간, 주거급여, 연말정산','예: 적금 금리, 주식 공시, 주거급여');
home=home.replace('<a href="/finance/loan-payment/">대출 이자 계산</a>',
  '<a href="/finance/savings/">예·적금 금리</a><a href="/finance/markets/">주식·경제 이슈</a>'
  +'<a href="/finance/loan-payment/">대출 계산기</a>');
home=home.replace('<section class="portal-home-section" aria-labelledby="portal-topic-title">',
 '<section class="finance-home-shortcuts" aria-labelledby="finance-shortcuts-title">'
 +'<div class="portal-section-heading"><h2 id="finance-shortcuts-title">금융정보</h2>'
 +'<p>은행별 공시 금리와 주식·경제 공식 발표</p></div>'
 +'<div class="finance-hub-grid">'
 +pageLink('/finance/savings/','예금·적금 금리 비교','은행·저축은행 · 기본·우대금리')
 +pageLink('/finance/markets/','주식·주요 이슈','기업 공시 · 경제정책 발표')
 +'</div></section><section class="portal-home-section" aria-labelledby="portal-topic-title">');
write('index.html',home);

const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const f=path.join(dir,e.name);return e.isDirectory()?walk(f):[f];
});
for(const file of walk(DIST).filter(f=>f.endsWith('.html'))){
 let html=fs.readFileSync(file,'utf8');
 // Put the three most-used finance destinations before long article categories
 // so mobile horizontal navigation does not hide them off the right edge.
 html=html.replace('<a href="/finance/">금융·계산</a>','');
 html=html.replace('<nav class="main-nav"><div class="nav-inner"><a href="/">홈</a>',
   '<nav class="main-nav"><div class="nav-inner"><a href="/">홈</a>'
   +'<a href="/finance/">금융정보</a><a href="/finance/savings/">예·적금</a>'
   +'<a href="/finance/markets/">주식·이슈</a>');
 if(!html.includes('href="/finance-experience.css"')){
   html=html.replace('</head>','<link rel="stylesheet" href="/finance-experience.css"></head>');
 }
 fs.writeFileSync(file,html);
}
let xml=read('sitemap.xml');
for(const pathname of ['/finance/savings/','/finance/markets/']){
 const location=SITE+pathname;
 if(!xml.includes('<loc>'+location+'</loc>'))
   xml=xml.replace('</urlset>','<url><loc>'+location+'</loc><lastmod>'+LAST_REVIEW+'</lastmod></url></urlset>');
}
write('sitemap.xml',xml);
for(const [filename,pathname] of configurations){
 const html=read(filename);
 if((html.match(/<link rel="canonical"/g)||[]).length!==1 ||
    !html.includes('href="'+SITE+pathname+'"') ||
    (html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1 ||
    !html.includes('name="description"') ||
    !html.includes('name="robots"')) throw new Error('Finance SEO check failed: '+filename);
}
// Search must surface new finance pages as well as articles. Preserve all
// existing post records; never index API-only data as permanent editorial text.
const searchIndex=JSON.parse(read('search-index.json'));
const financeIndex=[
 {title:'예·적금 금리 확인',description:'금융감독원 금융상품한눈에 공시에서 예금과 적금 금리 확인',keywords:['은행 예금 금리','정기예금 금리 비교','적금 금리 순위','저축은행 적금'],url:'/finance/savings/'},
 {title:'주식시장 주요 이슈·기업 공시',description:'주식 공시·경제금융 이슈와 금융정책·기업발표 확인',keywords:['주식 이슈','오늘의 주요뉴스','주식 관련 뉴스','DART 기업 공시','코스피 코스닥'],url:'/finance/markets/'},
 {title:'대출이자 계산기',description:'원리금균등 원금균등 만기일시상환 월 상환액과 총이자 비교',keywords:['대출 계산기','대출 이자 계산','대출 상환표','대출 원리금'],url:'/finance/loan-payment/'},
 {title:'금융정보',description:'예·적금 공식 비교공시 연결, 기업 공시·금융정책과 대출 계산기',keywords:['금융정보','은행별 금리','예금 적금','주식'],url:'/finance/'}
];
const slugs=new Set(searchIndex.map(item=>item.url));
for(const page of financeIndex){if(!slugs.has(page.url)){searchIndex.push(page);slugs.add(page.url);}}
write('search-index.json',JSON.stringify(searchIndex));

console.log('Finance experience: bank disclosures and official issue feeds, plus 3 repayment methods; '+configurations.length+' pages checked.');
