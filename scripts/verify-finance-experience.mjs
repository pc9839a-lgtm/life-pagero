import fs from 'node:fs';
import path from 'node:path';
const dist=path.resolve('dist');
const site='https://pagero.kr/life';
const url=relative=>fs.readFileSync(path.join(dist,relative),'utf8');
for(const [relative,pathname] of [
 ['finance/index.html','/finance/'],
 ['finance/savings/index.html','/finance/savings/'],
 ['finance/markets/index.html','/finance/markets/'],
 ['finance/loan-payment/index.html','/finance/loan-payment/']
]){
 const html=url(relative);
 if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)throw Error('H1 count: '+relative);
 if(!html.includes('<link rel="canonical" href="'+site+pathname+'">'))
  throw Error('Canonical mismatch: '+relative);
 if(!html.includes('<meta name="robots" content="index,follow'))
  throw Error('Finance route must remain indexable: '+relative);
 if(!html.includes('<link rel="stylesheet" href="/finance-experience.css">'))
  throw Error('Responsive stylesheet missing: '+relative);
 if(!html.includes('application/ld+json')||!html.includes('"url":"'+site+pathname+'"'))
  throw Error('Structured data URL mismatch: '+relative);
}
const home=url('index.html');
for(const href of ['/finance/savings/','/finance/markets/','/finance/loan-payment/']){
 if(!home.includes('href="'+href+'"'))throw Error('Homepage missing finance link: '+href);
}
const finance=url('finance/index.html');
for(const token of ['id="finance-rates-official"','id="finance-issues-official"','금융감독원','dart.fss.or.kr']){
 if(!finance.includes(token))throw Error('Finance hub missing a usable official destination: '+token);
}
if(finance.includes('id="finance-products"'))throw Error('Unconfigured product filters must not occupy finance hub');

for(const token of [
  'class="finance-index-hero"','class="finance-index-lead"',
  'id="finance-index-services"',
  'class="finance-index-services"','class="finance-index-tools"',
  'class="finance-index-official-list"','class="finance-index-check-list"',
  'href="/finance/savings/"','href="/finance/markets/"',
  'href="/finance/savings-calculator/"','href="/finance/loan-payment/"',
  'href="/finance/mortgage-calculator/"'
])if(!finance.includes(token))throw Error('Finance directory missing a usable entry: '+token);
for(const decorative of [
  'LIFE FINANCE','금리는 비교하고, 대출은 계산하고.',
  '필요한 숫자와 공식 자료를 한곳에서 찾으세요.',
  'class="finance-index-headline"','class="finance-index-eyebrow"',
  'class="finance-index-section-label"','class="finance-index-tile-number"',
  'class="finance-index-primary"','class="finance-index-icon"',
  'SERVICE 01','TOOLS 02','SOURCES 03'
])if(finance.includes(decorative))throw Error('Promotional template decoration returned: '+decorative);
if((finance.match(/class="finance-index-tile-copy"/g)||[]).length!==6)
  throw Error('Finance requires six distinct useful destinations');
if(!finance.includes('class="finance-index-tile finance-index-tile--featured" href="/finance/savings/"'))
  throw Error('Main savings comparison must be the single featured directory entry');
if(!finance.includes('class="finance-index-tile finance-index-tile--featured"'))
  throw Error('Savings comparison must remain the single featured financial service');
for(const [slug,expected] of [
  ['finance/savings/index.html','id="finance-rate-panel"'],
  ['finance/markets/index.html','id="finance-issues-panel"'],
  ['finance/loan-payment/index.html','id="loan-method-comparison"']
])if(!url(slug).includes(expected))throw Error('Finance subpage regression: '+slug);
const previewCss=url('finance-experience.css');
for(const snippet of [
  '.life-modern .finance-preview-grid{grid-template-columns:1fr;gap:8px}',
  'grid-template-areas:"bank rate" "product rate" "term rate"',
  'grid-area:product;min-width:0;font-size:13px'
])if(!previewCss.includes(snippet))
  throw Error('Mobile finance rate preview lost readable rows: '+snippet);
const financeCss=url('life-editorial-20261106.css');
for(const selector of [
  '.life-editorial .finance-index-hero',
  '.life-editorial .finance-index-services>.finance-index-tile--featured',
  '.life-editorial .finance-index-symbol',
  '.life-editorial .finance-index-lead',
  '.life-editorial .finance-index-services{',
  '.life-editorial .finance-index-official-list',
  '.life-editorial .finance-index-checks summary',
  '@media(max-width:700px)'
])if(!financeCss.includes(selector))throw Error('Finance service-dashboard style missing: '+selector);
const heroRule=financeCss.match(/\.life-editorial \.finance-index-hero\{([^}]+)\}/)?.[1]||'';
for(const marker of ['text-align:left','background:transparent','border-bottom:1px solid'])
  if(!heroRule.includes(marker))throw Error('Finance heading must stay compact: '+marker);
const tilesRule=financeCss.match(/\.life-editorial \.finance-index-services\{([^}]+)\}/)?.[1]||'';
if(!tilesRule.includes('grid-template-columns:repeat(2,minmax(0,1fr))'))
  throw Error('Finance service grid should render as two supporting columns on desktop');
const featureRule=financeCss.match(/\.life-editorial \.finance-index-services>\.finance-index-tile--featured\{([^}]+)\}/)?.[1]||'';
for(const marker of ['grid-column:1/-1','background:#202c37','color:#fff'])
  if(!featureRule.includes(marker))throw Error('Finance featured card lost its intended hierarchy: '+marker);
if((finance.match(/class="finance-index-symbol"/g)||[]).length!==6)
  throw Error('Finance destinations require six meaningful icons');
if(!finance.includes('class="finance-index-check-list"'))
  throw Error('Important official-source caveats must remain available');

const savings=url('finance/savings/index.html');
for(const token of ['id="finance-rates-official"','id="finance-rate-panel"','id="finance-products"']){
 if(!savings.includes(token))throw Error('Savings product progressive enhancement missing: '+token);
}
if(!savings.includes('id="finance-rate-panel"')||!savings.includes('heading" hidden')){
 // The filter must be initially hidden until an API has verified rows.
 if(!savings.includes('id="finance-rate-panel" aria-labelledby="bank-rates-heading" hidden'))
   throw Error('Unverified savings filter was visible by default');
}
const markets=url('finance/markets/index.html');
if(!markets.includes('id="finance-issues-panel"')||!markets.includes('id="finance-issues-official"'))
 throw Error('Markets verified-source fallback missing');
const frontend=fs.readFileSync(path.join(dist,'finance-live.js'),'utf8');
for(const term of ['실시간 공시 데이터 사용 불가','최신 공시 미확인','상품 데이터 인증키','현재 자동 수집을 사용할 수 없습니다','자료 수집 중']){
 for(const [filename,body] of [['finance.js',frontend],['finance/index.html',finance],['finance/savings/index.html',savings],['finance/markets/index.html',markets]]){
   if(body.includes(term))throw Error('Visible finance API excuse remains: '+term+' in '+filename);
 }
}
for(const term of ['if(ratePanel)ratePanel.hidden=true','if(ratePanel)ratePanel.hidden=false','if(issuePanel)issuePanel.hidden=true']){
 if(!frontend.includes(term))throw Error('Unavailable panels not gated by authenticated data: '+term);
}
const calc=url('finance/loan-payment/index.html');
for(const token of ['loan-grace','loan-extra','loan-method-comparison','loan-schedule-table',
  'loan-export','type="module" src="/portal-finance-calculator.js"']){
 if(!calc.includes(token))throw Error('Loan tool missing: '+token);
}
for(const slug of ['/finance/savings/','/finance/markets/']){
 if(!url('sitemap.xml').includes('<loc>'+site+slug+'</loc>'))
  throw Error('Sitemap missing '+slug);
}
console.log('PASS: finance SEO, official source fallback, no API failure banners, conditional verified tables and calculator controls');
