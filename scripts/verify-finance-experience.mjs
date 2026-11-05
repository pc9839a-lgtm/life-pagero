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
for(const token of ['id="finance-products"','id="finance-issues"','금융감독원','DART']){
 if(!finance.includes(token))throw Error('Finance hub missing: '+token);
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
console.log('PASS: finance SEO canonical, schema, indexability, links, disclosure filters and calculator controls');
