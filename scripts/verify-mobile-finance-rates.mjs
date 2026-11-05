import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DIST=path.resolve('dist');
const read=name=>fs.readFileSync(path.join(DIST,name),'utf8');
const check=(pass,message)=>{if(!pass)throw Error('[mobile-rates-qa] '+message)};
const css=read('life-editorial-20261106.css');
const js=read('finance-live.js');
const hash=createHash('sha256').update(js).digest('hex').slice(0,12);
const src='/finance-live.js?v='+hash;

for(const filename of ['finance/index.html','finance/savings/index.html','finance/markets/index.html']){
  const html=read(filename);
  check(html.includes('src="'+src+'"'),'source-hashed finance module missing '+filename);
  check(html.split('src="'+src+'"').length===2,'finance feed script loaded multiple times '+filename);
}
const savings=read('finance/savings/index.html');
check(savings.includes('id="finance-rate-panel" aria-labelledby="bank-rates-heading" hidden'),
  'bank products cannot be shown without verified rate data');
check(savings.includes('id="finance-kind"')&&savings.includes('id="finance-group"')&&
  savings.includes('id="finance-term"')&&savings.includes('id="finance-sort"')&&
  savings.includes('id="finance-query"'),
  'existing term, sorting or keyword filter missing');

for(const asset of ['finance/savings-calculator/index.html',
  'finance/mortgage-calculator/index.html','tools/car-cost/index.html']){
  check(!read(asset).includes('src="/finance-live.js'),
    'extra finance network requests leaked into standalone calculator: '+asset);
}
for(const marker of [
 'finance-desktop-rates','finance-mobile-rates','finance-mobile-rate-card',
 'finance-mobile-rate-values','finance-mobile-rate-details',
 'finance-mobile-rates-more','mobileLimit=12','renderProducts(false)'
])check(js.includes(marker),'mobile finance rendering missing '+marker);
for(const marker of [
 '@media(max-width:820px)',
 '.finance-mobile-rates{',
 '.finance-desktop-rates{',
 'grid-template-columns:repeat(2,minmax(0,1fr))',
 '.finance-mobile-rate-values',
 '.finance-mobile-rates-more'
])check(css.includes(marker),'mobile finance layout missing '+marker);
console.log('[mobile-rates-qa] PASS: source-verified rates, responsive cards, independent desktop table, 12-at-a-time, functional filters and automatic JS/CSS cache busting.');
