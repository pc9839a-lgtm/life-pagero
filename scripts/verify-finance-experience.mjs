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
