import fs from 'node:fs';
import path from 'node:path';

// These two calculators are independent static routes and run in-browser.
// The finance template carries the existing header, sponsor disclosure, SEO
// metadata, mobile navigation and footer. No external prices are invented.
const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const read=name=>fs.readFileSync(path.join(DIST,name),'utf8');
const save=(name,html)=>{
  const filename=path.join(DIST,name);
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  fs.writeFileSync(filename,html);
};
const ok=(cond,reason)=>{if(!cond)throw Error('[cost-calculators] '+reason);};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const field=(id,label,value,options='')=>
  '<label class="calc-field"><span>'+label+'</span>'
  +'<input type="number" id="'+id+'" name="'+id+'" value="'+value+'" '+options+'></label>';
const makePage=({url,title,description,body,module,schemaType='WebApplication'})=>{
  let html=read('finance/index.html');
  ok(html.includes('<main id="main-content">'),'base finance shell lost');
  html=html.replace(/<main id="main-content">[\s\S]*?<\/main>/,
    '<main id="main-content">'+body+'</main>');
  const replacements=[
    [/<title>[\s\S]*?<\/title>/,'<title>'+escape(title)+'</title>'],
    [/<meta name="description"[^>]*>/,
      '<meta name="description" content="'+escape(description)+'">'],
    [/<link rel="canonical"[^>]*>/,
      '<link rel="canonical" href="'+SITE+url+'">'],
    [/<meta property="og:title"[^>]*>/,
      '<meta property="og:title" content="'+escape(title)+'">'],
    [/<meta property="og:description"[^>]*>/,
      '<meta property="og:description" content="'+escape(description)+'">'],
    [/<meta property="og:url"[^>]*>/,
      '<meta property="og:url" content="'+SITE+url+'">']
  ];
  for(const [pattern,value] of replacements){
    ok(pattern.test(html),'SEO tag mismatch '+url+' '+pattern);
    html=html.replace(pattern,value);
  }
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
  const json={'@context':'https://schema.org','@type':schemaType,
    name:title,description,url:SITE+url,
    applicationCategory:'FinanceApplication',operatingSystem:'Web',
    offers:{'@type':'Offer',price:0,priceCurrency:'KRW'}};
  html=html.replace('</head>',
    '<script type="application/ld+json">'+JSON.stringify(json)+'</script>'
    +'<script type="module" src="'+module+'"></script></head>');
  html=html.replace(/<script defer src="\/finance-live\.js(?:\?v=[a-f0-9]{12})?"><\/script>/gi,'');
  ok((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,'H1 count '+url);
  ok((html.match(/<link rel="canonical"/g)||[]).length===1,'canonical count '+url);
  ok(html.includes('data-life-coupang-kind="body"'),'sponsor slot lost '+url);
  save(url.slice(1)+'index.html',html);
};
const annualField=(id,label,value)=>
  field('car-'+id,label,value,'min="0" max="100000000" step="1000" inputmode="numeric" required');
const monthlyField=(id,label,value)=>
  field('car-'+id,label,value,'min="0" max="100000000" step="1000" inputmode="numeric" required');

const carUrl='/tools/car-cost/';
const carTitle='자동차 유지비 계산기 | 연간·월간 주유비·보험·세금 | 생활비서';
const carDesc='차량 연비, 연간 주행거리, 주유·충전 단가, 보험, 세금, 정비, 주차비로 월간·연간 자동차 유지비와 km당 비용을 예상 계산합니다.';
const carBody='<div class="site-shell"><article class="portal-page finance-page lifestyle-calc-page car-cost-page">'
  +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / '
  +'<a href="/topics/">생활정보</a> / <a href="/car/">자동차</a> / 유지비 계산기</nav>'
  +'<h1>자동차 유지비 계산기</h1>'
  +'<div class="calculator-workspace car-workspace">'
  +'<form id="car-cost-form" novalidate>'
  +'<div class="calculator-form-header"><strong>차량과 운행 조건</strong><span>연비와 주행거리부터 입력하세요</span></div>'
  +'<div class="cost-field-grid cost-primary-fields">'
  +'<label class="calc-field"><span>연료 유형</span><select id="car-fuel">'
  +'<option value="petrol">휘발유</option><option value="hybrid" selected>하이브리드</option>'
  +'<option value="diesel">경유</option><option value="lpg">LPG</option><option value="electric">전기</option></select></label>'
  +field('car-annual-km','연간 주행거리 (km)',12000,
    'min="0" max="200000" step="500" inputmode="numeric" required')
  +'<label class="calc-field"><span id="car-efficiency-label">연비 (km/L)</span>'
  +'<input id="car-efficiency" type="number" min="0.01" max="100" step="0.1" value="16" inputmode="decimal" required></label>'
  +'<label class="calc-field"><span id="car-unit-label">주유 단가 (원/L)</span>'
  +'<input id="car-unit-price" type="number" min="0" max="100000" step="10" value="1700" inputmode="numeric" required></label>'
  +'</div><details class="cost-advanced"><summary>보험·세금·주차 등 유지비 수정</summary>'
  +'<div class="cost-field-grid cost-extra-fields">'
  +annualField('insurance-year','보험료 (연간)',850000)
  +annualField('car-tax-year','자동차세 (연간)',280000)
  +monthlyField('parking-month','주차비 (월간)',40000)
  +monthlyField('toll-month','통행료 (월간)',30000)
  +monthlyField('washing-month','세차비 (월간)',10000)
  +annualField('maintenance-year','정비·소모품 (연간)',300000)
  +annualField('inspection-year','검사비 예상 (연평균)',50000)
  +annualField('tires-year','타이어 교체비 (연평균)',100000)
  +annualField('depreciation-year','감가상각 (연간, 선택)',0)
  +monthlyField('loan-monthly','차량대출 납부액 (월간, 선택)',0)
  +'</div></details><p class="cost-examples">보험·세금·기타 비용은 예시 금액으로 계산됩니다. 필요하면 위에서 수정하세요.</p>'
  +'<p id="car-cost-error" class="cost-error" hidden role="alert"></p>'
  +'<button class="cost-submit" type="submit">유지비 다시 계산</button></form>'
  +'<section class="cost-result" aria-label="자동차 유지비 예상 결과">'
  +'<span class="cost-result-kicker">월평균 예상 유지비</span>'
  +'<strong id="car-cost-monthly" class="cost-result-primary">—</strong>'
  +'<div class="cost-result-metrics">'
  +'<div><span>연간 총비용</span><strong id="car-cost-annual">—</strong></div>'
  +'<div><span>1km당 비용</span><strong id="car-cost-per-km">—</strong></div>'
  +'<div><span>연간 주유·충전비</span><strong id="car-cost-fuel-total">—</strong></div>'
  +'</div></section>'
  +'</div>'
  +'<details class="cost-breakdown" open><summary>비용 항목별 상세</summary>'
  +'<div class="cost-table-scroll"><table><thead><tr><th scope="col">항목</th>'
  +'<th scope="col">월평균</th><th scope="col">연간</th></tr></thead>'
  +'<tbody id="car-cost-breakdown"></tbody></table></div></details>'
  +'<p class="cost-note">연비·전비와 실제 세금·보험·차량 상태에 따라 비용이 달라집니다. '
  +'감가상각과 차량대출 원금은 함께 합산할 경우 자산 비용이 중복 계산될 수 있으므로 필요에 따라 하나만 사용하세요. '
  +'주유·충전 단가는 직접 입력하는 값입니다.</p>'
  +'</article></div>';
makePage({url:carUrl,title:carTitle,description:carDesc,body:carBody,
  module:'/car-cost-calculator.js'});

const mortgageUrl='/finance/mortgage-calculator/';
const mortgageTitle='주택담보대출 한도·월 상환액 계산기 | LTV·DSR | 생활비서';
const mortgageDesc='주택가격, 인정 소득, 기존 대출 상환액, LTV, DSR 및 스트레스 금리로 예상 주택담보대출 한도와 월 원리금, 필요 자기자금을 계산합니다.';
const mortgageField=(name,label,value,extra='')=>
  field('mortgage-'+name,label,value,extra+' inputmode="decimal" required');
const mortgageBody='<div class="site-shell"><article class="portal-page finance-page lifestyle-calc-page mortgage-calc-page">'
  +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / '
  +'<a href="/finance/">금융</a> / 주택담보대출 계산기</nav>'
  +'<h1>주택담보대출 한도·상환 계산기</h1>'
  +'<div class="calculator-workspace mortgage-workspace">'
  +'<form id="mortgage-form" novalidate>'
  +'<div class="calculator-form-header"><strong>대출 기본 조건</strong><span>주택가격·소득·금리 입력</span></div>'
  +'<div class="cost-field-grid">'
  +'<label class="calc-field"><span>주택 소재지 유형</span><select id="mortgage-area">'
  +'<option value="regulated">수도권 규제지역</option>'
  +'<option value="metro" selected>수도권 비규제지역</option>'
  +'<option value="regional">비수도권 비규제지역</option>'
  +'</select></label>'
  +'<label class="calc-field"><span>생애최초 구입 해당 여부</span>'
  +'<span class="cost-checkbox"><input type="checkbox" id="mortgage-first-home"> 생애최초</span></label>'
  +mortgageField('home-price','주택가격 (만원)',40000,'min="1000" max="1000000" step="100"')
  +mortgageField('cash-available','보유 자기자금 (만원)',10000,'min="0" max="1000000" step="100"')
  +mortgageField('annual-income','금융회사 인정 연소득 (만원)',5000,'min="0" max="1000000" step="100"')
  +mortgageField('existing-debt-annual','기존대출 연간 원리금 (만원)',300,'min="0" max="1000000" step="10"')
  +mortgageField('rate','예상 실제 대출금리 (연 %)',4.5,'min="0" max="30" step="0.1"')
  +mortgageField('years','대출기간 (년)',30,'min="1" max="50" step="1"')
  +'</div><details class="cost-advanced"><summary>LTV·DSR·규제값 직접 수정</summary>'
  +'<div class="cost-field-grid cost-extra-fields">'
  +mortgageField('ltv','LTV (%)',70,'min="0" max="100" step="1"')
  +mortgageField('dsr','DSR (%)',40,'min="0" max="100" step="1"')
  +mortgageField('stress','DSR 스트레스 가산금리 (%p)',3,'min="0" max="15" step="0.1"')
  +mortgageField('regulatory-cap','가격·지역별 상한 (만원, 0=없음)',60000,
    'min="0" max="1000000" step="100"')
  +mortgageField('collateral-deduction','선순위·방공제 차감액 (만원)',0,
    'min="0" max="1000000" step="100"')
  +'</div></details><p class="cost-examples">지역·생애최초 조건에 따라 규제값을 자동 반영합니다. '
  +'세부 대출 규정 및 본인 조건에 맞게 LTV·DSR·스트레스 금리와 차감액을 수정하세요.</p>'
  +'<p id="mortgage-error" class="cost-error" hidden role="alert"></p>'
  +'<button class="cost-submit" type="submit">예상 한도 계산</button></form>'
  +'<section class="cost-result" aria-label="주택담보대출 예상 결과">'
  +'<span class="cost-result-kicker">예상 대출 가능액</span>'
  +'<strong id="mortgage-limit" class="cost-result-primary">—</strong>'
  +'<span id="mortgage-limit-reason" class="cost-result-reason"></span>'
  +'<div class="cost-result-metrics">'
  +'<div><span>월 예상 원리금 (실제 금리 기준)</span><strong id="mortgage-monthly">—</strong></div>'
  +'<div><span>필요 자기자금</span><strong id="mortgage-required-cash">—</strong></div>'
  +'<div><span>보유금 대비 부족액</span><strong id="mortgage-shortfall">—</strong></div>'
  +'<div><span>총 예상 이자</span><strong id="mortgage-total-interest">—</strong></div>'
  +'</div><p class="cost-note" id="mortgage-cash-note"></p></section>'
  +'</div>'
  +'<details class="cost-breakdown" open><summary>한도를 결정하는 기준</summary>'
  +'<div class="mortgage-limit-rows">'
  +'<div><span>LTV 적용 한도</span><strong id="mortgage-ltv-limit">—</strong></div>'
  +'<div><span>스트레스 DSR 한도</span><strong id="mortgage-dsr-limit">—</strong></div>'
  +'<div><span>지역·주택가격별 한도</span><strong id="mortgage-cap-limit">—</strong></div>'
  +'<div><span>DSR 심사 적용 금리</span><strong id="mortgage-stress-rate">—</strong></div>'
  +'</div></details>'
  +'<p class="cost-note">주택 구입 목적의 일반 은행권 원리금균등 상환을 가정한 참고 계산입니다. '
  +'스트레스 금리는 DSR 한도 산정에만 적용되며 실제 이자 납부금리에 더하지 않습니다. '
  +'차주별 DSR 적용 대상, 정책모기지, 주택 수·처분 조건, 규제지역, 만기 제한, 담보평가, '
  +'전세보증금·방공제, 선순위 채권, 소득 인정 방법, 취득세·중개보수는 별도 검토해야 합니다. '
  +'현재 기본 입력값은 예시이며 실제 승인·한도를 보장하지 않습니다. '
  +'<a href="https://www.fsc.go.kr/po020201/85518" target="_blank" rel="noopener noreferrer">'
  +'금융위원회 대출규제 공식 안내</a></p>'
  +'</article></div>';
makePage({url:mortgageUrl,title:mortgageTitle,description:mortgageDesc,
  body:mortgageBody,module:'/mortgage-calculator.js'});

// Add genuine navigation: finance hub, car category and lifestyle hub.
let finance=read('finance/index.html');
const financeAnchor='<a class="finance-hub-card" href="/finance/loan-payment/"';
ok(finance.includes(financeAnchor),'finance links insertion anchor missing');
finance=finance.replace(financeAnchor,
  '<a class="finance-hub-card" href="'+mortgageUrl+'"><strong>주택담보대출 한도 계산기</strong></a>'
  +financeAnchor);
save('finance/index.html',finance);

let topics=read('topics/index.html');
const ending='</nav></article></div>';
ok(topics.includes(ending),'topics links insertion anchor missing');
topics=topics.replace(ending,
  '<a class="topics-hub-link" href="'+carUrl+'"><strong>자동차 유지비 계산기</strong>'
  +'<span>주행거리·연료비·보험·세금·정비비 합산</span>'
  +'<span aria-hidden="true" class="topics-chevron">›</span></a>'+ending);
save('topics/index.html',topics);

let cars=read('car/index.html');
const carAnchor='<div class="modern-list-toolbar">';
ok(cars.includes(carAnchor),'car listing toolbar missing');
cars=cars.replace(carAnchor,
  '<a class="car-cost-category-link" href="'+carUrl+'">자동차 유지비 계산기 ›</a>'
  +carAnchor);
save('car/index.html',cars);

// Search and sitemap remain idempotent across subsequent builds.
let sitemap=read('sitemap.xml');
let idx=JSON.parse(read('search-index.json'));
for(const {url,title,description,keywords} of [
  {url:carUrl,title:carTitle,description:carDesc,
    keywords:['자동차 유지비 계산기','주유비 계산','전기차 충전비','연간 자동차세','자동차 보험료']},
  {url:mortgageUrl,title:mortgageTitle,description:mortgageDesc,
    keywords:['주담대 한도','LTV','DSR','주택담보대출 계산기','아파트 대출','부동산 대출']}
]){
  if(!sitemap.includes('<loc>'+SITE+url+'</loc>'))
    sitemap=sitemap.replace('</urlset>',
      '<url><loc>'+SITE+url+'</loc><lastmod>2026-11-06</lastmod></url></urlset>');
  if(!idx.some(e=>e.url===url))idx.push({title,description,url,keywords});
}
save('sitemap.xml',sitemap);
save('search-index.json',JSON.stringify(idx));
console.log('[calculators] Added vehicle operating-cost and mortgage limit+repayment pages, navigation, SEO and site search.');
