import fs from 'node:fs';
import path from 'node:path';

const DIST=path.resolve('dist');
const css='/life-editorial-20261105.css';
const old=['/life-modern.css','/life-compact.css','/life-global-nav.css',
  '/today-dashboard.css','/today-wide.css'];
const check=(condition,message)=>{if(!condition)throw Error('[editorial-qa] '+message);};
const read=p=>fs.readFileSync(path.join(DIST,p),'utf8');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
  const full=path.join(dir,ent.name);
  return ent.isDirectory()?walk(full):[full];
});
const pages=walk(DIST).filter(p=>p.endsWith('.html'));
let checked=0,articles=0;
for(const absolute of pages){
  const relative=path.relative(DIST,absolute).replaceAll(path.sep,'/');
  const html=fs.readFileSync(absolute,'utf8');
  if(!html.includes('<header class="site-header">'))continue;
  check(html.includes('class="life-modern life-editorial '),
    'editorial body class missing '+relative);
  check((html.match(/href="\/life-editorial-20261105\.css"/g)||[]).length===1,
    'editorial theme not loaded exactly once '+relative);
  check(!old.some(s=>html.includes('href="'+s+'"')),
    'conflicting old stylesheet still loaded '+relative);
  check((html.match(/<link rel="canonical"/g)||[]).length===1,
    'SEO canonical changed '+relative);
  check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
    'primary headline altered '+relative);
  check(html.includes('aria-label="전체 메뉴"'),
    'global navigation lost '+relative);
  if(/^(?:car|support)\/[^/]+\/index\.html$/.test(relative)){
    check(html.includes('<details id="compact-full-guide" class="compact-full-guide" open>'),
      'complete original article is still collapsed '+relative);
    check(html.includes('class="compact-answer"'),'article first fact missing '+relative);
    check(html.includes('class="article-content"'),'article body missing '+relative);
    articles++;
  }
  checked++;
}
check(checked>=150,'not enough editorial pages: '+checked);
check(articles===46,'all 46 articles must remain published: '+articles);
const home=read('index.html');
check(home.includes('<h1>오늘 필요한 정보</h1>'),'home title not rewritten');
check(home.includes('class="hero portal-home-hero editorial-hero"'),
  'editorial home hero missing');
check((home.match(/class="portal-topic-card compact-topic"/g)||[]).length===6,
  'six original topic links lost');
check(home.includes('<details class="compact-explore compact-latest" open>'),
  'recently updated original articles still hidden');
check((home.match(/data-affiliate="tenping-/g)||[]).length===4,
  'original affiliate cards altered');
check((home.match(/data-life-coupang-kind="(?:middle|body)"/g)||[]).length===2,
  'original homepage advertising slots altered');
check((home.match(/data-life-coupang-kind="rail"/g)||[]).length===1,
  'original sidebar advertising altered');
for(const name of ['car','support']){
  const html=read(name+'/index.html');
  check(html.includes('id="modern-article-list"')&&html.includes('id="modern-list-filter"'),
    'category article discovery/search missing: '+name);
}
const today=read('today/index.html');
check(today.includes('class="today-viewport"')&&
  today.includes('class="today-vertical-list editorial-desk"'),
  'Today is no longer a full-width, vertical news reading page');
const positions=['data-today-news','data-today-weather',
  'data-today-stocks','data-today-crypto'].map(k=>today.indexOf(k));
check(positions.every((p,i)=>p>=0&&(i===0||p>positions[i-1])),
  'Today section priority changed');
for(const target of ['https://www.yna.co.kr/','https://www.weather.go.kr/',
  'https://upbit.com/','https://data.krx.co.kr/']){
  check(today.includes(target),'Today official source lost: '+target);
}
const calc=read('finance/loan-payment/index.html');
for(const item of ['id="portal-loan-form"','id="loan-method-comparison"',
  'id="loan-schedule-table"','id="loan-export"']){
  check(calc.includes(item),'finance calculator functionality missing '+item);
}
const savings=read('finance/savings/index.html');
check(savings.includes('id="finance-rate-panel"'),
  'verified savings rates functionality missing');
const market=read('finance/markets/index.html');
check(market.includes('data-today-crypto')&&market.includes('id="finance-issues"'),
  'market quotes or official disclosures missing');
check(fs.statSync(path.join(DIST,css.slice(1))).size>14000,
  'responsive editorial design stylesheet missing');
const style=read(css.slice(1));
for(const marker of [
 'grid-template-columns:1fr;gap:0', // one-column magazine list
 'body.life-editorial',
 '.life-editorial .today-news-list',
 '.life-editorial .article-content',
 '@media(max-width:700px)',
 'max-width:none'
])check(style.includes(marker),'editorial CSS missing critical rule: '+marker);
console.log('[editorial-qa] PASS '+checked+' pages, 46 fully open articles, one stylesheet, 4 live info sources, original ads, finance/calculator and canonical links.');
