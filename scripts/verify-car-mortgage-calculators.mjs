import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const check=(value,message)=>{if(!value)throw Error('[additional-tools-qa] '+message);};

for(const [relative,url,heading,script] of [
  ['tools/car-cost/index.html','/tools/car-cost/','자동차 유지비 계산기','/car-cost-calculator.js'],
  ['finance/mortgage-calculator/index.html','/finance/mortgage-calculator/',
    '주택담보대출 한도·상환 계산기','/mortgage-calculator.js']
]){
  const html=get(relative);
  check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
    'wrong primary heading count: '+relative);
  check(html.includes('<h1>'+heading+'</h1>'),'wrong page heading: '+relative);
  check(html.includes('<link rel="canonical" href="https://pagero.kr/life'+url+'">'),
    'canonical mismatch: '+relative);
  check(html.includes('name="robots" content="index,follow'),
    'nonindexable tool: '+relative);
  check(html.includes('src="'+script+'"'),
    'working JavaScript module not attached: '+relative);
  check(html.includes('class="life-modern life-editorial '),
    'sitewide magazine theme missing: '+relative);
  check(html.includes('href="/life-editorial-20261106.css"'),
    'single editorial stylesheet missing: '+relative);
  check(!html.includes('href="/life-global-nav.css"'),
    'legacy nav theme leaked to '+relative);
  check(html.includes('data-life-coupang-kind="body"'),
    'original finance sponsor is missing '+relative);
  check(html.includes('aria-label="전체 메뉴"'),
    'unified top nav missing '+relative);
  check(get('sitemap.xml').includes('<loc>https://pagero.kr/life'+url+'</loc>'),
    'public sitemap missing '+relative);
  check(JSON.parse(get('search-index.json')).some(x=>x.url===url),
    'site search index missing '+relative);
}
const car=get('tools/car-cost/index.html');
for(const id of ['car-cost-form','car-fuel','car-annual-km','car-efficiency',
  'car-unit-price','car-insurance-year','car-car-tax-year','car-parking-month',
  'car-toll-month','car-washing-month','car-maintenance-year','car-inspection-year',
  'car-tires-year','car-depreciation-year','car-loan-monthly',
  'car-cost-monthly','car-cost-annual','car-cost-per-km','car-cost-breakdown']){
  check(car.includes('id="'+id+'"'),'missing car ownership field '+id);
}
check(get('topics/index.html').includes('href="/tools/car-cost/"'),
  'car cost tool not linked from lifestyle hub');
check(get('car/index.html').includes('href="/tools/car-cost/"'),
  'car category page must link to the car calculator');

const mortgage=get('finance/mortgage-calculator/index.html');
for(const id of ['mortgage-form','mortgage-area','mortgage-first-home',
  'mortgage-home-price','mortgage-annual-income','mortgage-existing-debt-annual',
  'mortgage-cash-available','mortgage-rate','mortgage-years','mortgage-ltv',
  'mortgage-dsr','mortgage-stress','mortgage-regulatory-cap',
  'mortgage-collateral-deduction','mortgage-limit','mortgage-monthly',
  'mortgage-ltv-limit','mortgage-dsr-limit','mortgage-cap-limit',
  'mortgage-required-cash','mortgage-shortfall','mortgage-total-interest']){
  check(mortgage.includes('id="'+id+'"'),'mortgage input/output missing '+id);
}
check(get('finance/index.html').includes('href="/finance/mortgage-calculator/"'),
  'mortgage calculator not linked from finance landing page');
check(mortgage.includes('https://www.fsc.go.kr/po020201/85518'),
  'official lending regulation source not attached');
check(mortgage.includes('실제 승인·한도를 보장하지 않습니다'),
  'lending qualification risk disclosure missing');
for(const path of ['car-cost-math.js','car-cost-calculator.js',
  'mortgage-math.js','mortgage-calculator.js']){
  check(fs.existsSync(root+'/'+path),'calculator implementation not copied: '+path);
  check(fs.statSync(root+'/'+path).size>1300,'impl suspiciously short: '+path);
}
const css=get('life-editorial-20261106.css');
for(const marker of ['.lifestyle-calc-page','.cost-field-grid',
  '.cost-result','.mortgage-limit-rows','@media(max-width:540px)']){
  check(css.includes(marker),'responsive calculator CSS missing: '+marker);
}
console.log('[additional-tools-qa] PASS: car and mortgage calculators, required numeric fields, source caveat, correct menu links, mobile styles, SEO and original advertising.');
