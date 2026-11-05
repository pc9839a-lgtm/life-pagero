import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(yes,message)=>{if(!yes)throw Error('[savings-qa] '+message);};
const relative='finance/savings-calculator/index.html';
const html=get(relative);
assert((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,'expected single heading');
assert(html.includes('<link rel="canonical" href="https://pagero.kr/life/finance/savings-calculator/">'),
  'wrong canonical');
assert(html.includes('name="robots" content="index,follow'),'calculator must be indexable');
assert(html.includes('src="/savings-calculator.js"'),
  'working interactive module not linked');
assert(html.includes('application/ld+json') &&
  html.includes('\"applicationCategory\":\"FinanceApplication\"'),
  'calculator schema missing');
for(const id of ['savings-calculator-form','savings-monthly','savings-months','savings-rate',
  'savings-tax','savings-maturity','savings-principal','savings-gross-interest',
  'savings-tax-amount','savings-net-interest','savings-schedule','savings-copy']){
  assert(html.includes('id="'+id+'"'),'calculator field missing '+id);
}
assert(html.includes('일반과세 15.4%')&&html.includes('비과세 0%'),
  'the two tax categories are not selectable');
assert(html.includes('https://finlife.fss.or.kr/'),
  'official financial product data link missing');
assert(html.includes('data-life-coupang-kind="body"'),
  'original labelled advertiser placement missing');
for(const asset of ['savings-math.js','savings-calculator.js']){
  assert(fs.statSync(path.join(root,asset)).size>1500,
    'browser-side module missing '+asset);
}
const hub=get('finance/index.html'),savings=get('finance/savings/index.html');
assert(hub.includes('href="/finance/savings-calculator/"'),
  'calculator not discoverable from finance hub');
assert(savings.includes('href="/finance/savings-calculator/"'),
  'calculator not discoverable from savings rates page');
assert(get('sitemap.xml').includes('<loc>https://pagero.kr/life/finance/savings-calculator/</loc>'),
  'missing sitemap route');
assert(JSON.parse(get('search-index.json')).some(r=>r.url==='/finance/savings-calculator/'),
  'missing site search entry');
const theme=get('life-editorial-20261106.css');
for(const part of ['.savings-calc-page','.savings-calc-fields',
  '.savings-calc-results','.savings-calc-metrics',
  '@media(max-width:700px)']){
  assert(theme.includes(part),'responsive calculator style missing '+part);
}
assert(html.includes('class="life-modern life-editorial '),
  'single final sitewide theme not applied');
assert(!html.includes('href="/life-modern.css"')&&
  !html.includes('href="/life-compact.css"'),
  'old duplicate CSS leaked into calculator');
console.log('[savings-qa] PASS calculation page, official source, tax modes, two navigation entry points, single editorial theme, ads, SEO, responsive styles and search.');
