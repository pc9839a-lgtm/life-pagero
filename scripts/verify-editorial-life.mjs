import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DIST=path.resolve('dist');
const css='/life-editorial-20261106.css';
const old=['/life-modern.css','/life-compact.css','/life-global-nav.css',
  '/today-dashboard.css','/today-wide.css'];
const check=(condition,message)=>{if(!condition)throw Error('[editorial-qa] '+message);};
const read=p=>fs.readFileSync(path.join(DIST,p),'utf8');
const themeHash=createHash('sha256').update(read(css.slice(1))).digest('hex').slice(0,12);
const themeHref=css+'?v='+themeHash;
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
  check(html.split('href="'+themeHref+'"').length===2,
    'exact content-hashed editorial theme not loaded once '+relative);
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
check(home.includes('<h1>오늘 궁금한 정보, 한곳에서</h1>'),'reference home headline missing');
check(home.includes('class="hero portal-home-hero editorial-hero"'),
  'editorial home hero missing');
check((home.match(/class="life-home-service-card"/g)||[]).length===12,
  '4 by 3 portal shortcuts missing');
for(const route of ['/today/','/finance/savings/','/finance/loan-payment/',
  '/finance/markets/','/food/','/events/','/deals/',
  '/finance/mortgage-calculator/','/car/','/support/','/topics/']) {
  check(home.includes('class="life-home-service-card" href="'+route+'"'),
    'homepage portal shortcut missing: '+route);
}
check(home.includes('class="life-home-service-grid"'),
  'reference-inspired portal feature grid missing');
check(home.includes('aria-label="생활비서 서비스 바로가기"'),
  'accessible homepage service navigation missing');
check(home.includes('class="life-home-search-panel" id="life-home-search"')
  && home.includes('href="#life-home-search"') && home.includes('id="portal-home-q"'),
  'search drawer or keyboard-search form broken');
check(home.includes('<details class="life-home-more-categories">'),
  'original editorial category links are not accessible');
check((home.match(/class="life-home-spot-thumb /g)||[]).length===3,
  'three thumbnail editorial links missing');
const sponsorPosition=home.indexOf('<section class="modern-sponsored-area"');
const archivePosition=home.indexOf('<details class="modern-all-articles">');
check(sponsorPosition>0 && archivePosition>sponsorPosition,
  'original full-width ad section must appear before deep article archive');
const editorialStyle=read('life-editorial-20261106.css');
check(editorialStyle.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),
  '4-column service layout CSS missing');
check(editorialStyle.includes('.modern-sponsored-area .life-coupang-widget')
  && editorialStyle.includes('max-width:none'),
  'mobile sponsored widget width remains constrained');
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
 '.life-editorial.life-modern-article .article-content',
 '@media(max-width:700px)',
 'max-width:none'
])check(style.includes(marker),'editorial CSS missing critical rule: '+marker);
console.log('[editorial-qa] PASS '+checked+' pages, 46 fully open articles, one stylesheet, 4 live info sources, original ads, finance/calculator and canonical links.');
