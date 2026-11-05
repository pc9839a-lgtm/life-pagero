import fs from 'node:fs';
import path from 'node:path';

// Full-featured, standalone fixed-installment savings calculator.
// Reuse original finance document head/footer/sponsor disclosure,
// but not its product API; this calculation works entirely in browser.
const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const URL='/finance/savings-calculator/';
const TITLE='적금 계산기 | 세전·세후 이자 및 만기 수령액 | 생활비서';
const DESC='월 납입액, 기간, 연이율, 과세 방식을 입력해 적금 납입원금과 세전·세후 이자, 만기 예상 수령액을 계산합니다.';
const read=p=>fs.readFileSync(path.join(DIST,p),'utf8');
const write=(p,content)=>{
  const filename=path.join(DIST,p);
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  fs.writeFileSync(filename,content);
};
const check=(ok,reason)=>{if(!ok)throw Error('[savings-calculator] '+reason);};
const presets=items=>items.map(([value,label])=>
  '<button type="button" data-savings-preset="'+value+'" aria-pressed="false">'+label+'</button>'
).join('');
const terms=items=>items.map(([value,label])=>
  '<button type="button" data-savings-term="'+value+'" aria-pressed="false">'+label+'</button>'
).join('');
const amountInput='<label class="savings-field"><span>월 납입액</span>'
  +'<div class="savings-input-unit"><input id="savings-monthly" type="number" min="1000" max="1000000000" step="1000" value="500000" inputmode="numeric" required><span>원</span></div></label>';
const periodInput='<label class="savings-field"><span>납입 기간</span>'
  +'<div class="savings-input-unit"><input id="savings-months" type="number" min="1" max="120" step="1" value="12" inputmode="numeric" required><span>개월</span></div></label>';
const interestInput='<label class="savings-field"><span>연이율 (세전)</span>'
  +'<div class="savings-input-unit"><input id="savings-rate" type="number" min="0" max="30" step="0.01" value="3.5" inputmode="decimal" required><span>%</span></div></label>';
const taxInput='<label class="savings-field"><span>이자소득 과세</span>'
  +'<select id="savings-tax"><option value="15.4" selected>일반과세 15.4%</option>'
  +'<option value="0">비과세 0%</option></select></label>';
const metrics=[
  ['savings-principal','납입 원금'],['savings-gross-interest','세전 이자'],
  ['savings-tax-amount','예상 이자 세금'],['savings-net-interest','세후 이자']
].map(([id,label])=>'<div><dt>'+label+'</dt><dd id="'+id+'">—</dd></div>').join('');
const body='<div class="site-shell"><article class="portal-page finance-page savings-calc-page">'
  +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / '
  +'<a href="/finance/">금융</a> / 적금 계산기</nav>'
  +'<div class="savings-page-head"><h1>적금 계산기</h1>'
  +'<a href="/finance/savings/">예·적금 금리 확인</a></div>'
  +'<div class="calculator-workspace savings-workspace">'
  +'<form id="savings-calculator-form" novalidate>'
  +'<div class="calculator-form-header"><strong>조건 입력</strong><span>입력하면 바로 계산됩니다</span></div>'
  +'<div class="savings-calc-fields">'+amountInput+periodInput+interestInput+taxInput+'</div>'
  +'<div class="savings-calc-shortcuts">'
  +'<div class="savings-preset-row"><span>월 납입액</span>'
  +presets([[100000,'10만원'],[300000,'30만원'],[500000,'50만원'],[1000000,'100만원']])
  +'</div><div class="savings-preset-row"><span>기간</span>'
  +terms([[6,'6개월'],[12,'12개월'],[24,'24개월'],[36,'36개월']])
  +'</div></div><p id="savings-error" role="alert" hidden></p>'
  +'<button class="savings-calc-submit" type="submit">금액 다시 계산</button></form>'
  +'<section class="savings-calc-results" aria-label="적금 계산 결과">'
  +'<div class="savings-calc-result-top"><span>예상 만기 수령액</span>'
  +'<strong id="savings-maturity">—</strong>'
  +'<span id="savings-summary-terms"></span></div>'
  +'<dl class="savings-calc-metrics">'+metrics+'</dl>'
  +'<button id="savings-copy" type="button" class="savings-copy">계산 결과 복사</button>'
  +'</section>'
  +'</div>'
  +'<details class="savings-calc-details"><summary>회차별 예상 이자 보기</summary>'
  +'<div class="savings-table-wrap"><table><thead><tr><th scope="col">회차</th>'
  +'<th scope="col">납입액</th><th scope="col">운용 기간</th>'
  +'<th scope="col">세전 이자</th></tr></thead><tbody id="savings-schedule"></tbody>'
  +'</table></div></details>'
  +'<p class="savings-calc-note">매월 초 동일 금액 납입·월 단위 단리 기준의 예상 계산입니다. '
  +'일반과세 15.4% 또는 비과세를 선택할 수 있습니다. 실제 이자는 납입일, 일할 계산, 반올림, '
  +'우대금리와 세금 적용 조건에 따라 달라질 수 있습니다. 입력 금리는 가정값이며 실제 판매 금리가 아닙니다. '
  +'<a href="https://finlife.fss.or.kr/" target="_blank" rel="noopener noreferrer">금융감독원 상품 비교</a></p>'
  +'</article></div>';
let html=read('finance/index.html');
check(html.includes('<main id="main-content">'),'finance shell missing');
html=html.replace(/<main id="main-content">[\s\S]*?<\/main>/,
  '<main id="main-content">'+body+'</main>');
const seo=[
  [/<title>[\s\S]*?<\/title>/,'<title>'+TITLE+'</title>'],
  [/<meta name="description"[^>]*>/,'<meta name="description" content="'+DESC+'">'],
  [/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+URL+'">'],
  [/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="'+TITLE+'">'],
  [/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="'+DESC+'">'],
  [/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+URL+'">']
];
for(const [regex,replacement] of seo){
  check(regex.test(html),'SEO template mismatch '+regex);
  html=html.replace(regex,replacement);
}
html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
const schema={'@context':'https://schema.org','@type':'WebApplication',
  name:'적금 계산기',description:DESC,url:SITE+URL,
  applicationCategory:'FinanceApplication',operatingSystem:'Web',
  offers:{'@type':'Offer',price:0,priceCurrency:'KRW'}};
html=html.replace('</head>','<script type="application/ld+json">'
  +JSON.stringify(schema)+'</script>'
  +'<script type="module" src="/savings-calculator.js"></script></head>');
html=html.replace('<script defer src="/finance-live.js"></script>','');
check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
  'must keep one page heading');
check((html.match(/<link rel="canonical"/g)||[]).length===1,
  'must keep one canonical');
check((html.match(/data-life-coupang-kind="body"/g)||[]).length===1,
  'original labeled finance sponsor lost');
write('finance/savings-calculator/index.html',html);

let hub=read('finance/index.html');
const anchor='<a class="finance-hub-card" href="/finance/loan-payment/"';
check(hub.includes(anchor),'finance calculator shortcut insertion target missing');
hub=hub.replace(anchor,
  '<a class="finance-hub-card" href="'+URL+'"><strong>적금 계산기</strong></a>'+anchor);
write('finance/index.html',hub);

let savings=read('finance/savings/index.html');
const title='<h1>예·적금 금리 확인</h1>';
check(savings.includes(title),'savings list title missing');
savings=savings.replace(title,title+
  '<a class="savings-calc-shortcut" href="'+URL+'">매달 납입액으로 만기 수령액 계산 ›</a>');
write('finance/savings/index.html',savings);
let sitemap=read('sitemap.xml');
if(!sitemap.includes('<loc>'+SITE+URL+'</loc>')){
  sitemap=sitemap.replace('</urlset>',
    '<url><loc>'+SITE+URL+'</loc><lastmod>2026-11-06</lastmod></url></urlset>');
  write('sitemap.xml',sitemap);
}
const index=JSON.parse(read('search-index.json'));
if(!index.some(row=>row.url===URL))index.push({
  title:TITLE,description:DESC,url:URL,
  keywords:['적금 계산기','적금 이자 계산','적금 만기 수령액','적금 세후 이자','월 납입']
});
write('search-index.json',JSON.stringify(index));
console.log('[savings] Published /finance/savings-calculator/, finance hub and savings link; search/sitemap/SEO preserved.');
