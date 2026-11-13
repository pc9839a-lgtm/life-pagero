import fs from 'node:fs';
import path from 'node:path';
import {publishedGuideCount,requiredScenarioCount} from './published-guide-count.mjs';
import {createHash} from 'node:crypto';

const DIST=path.resolve('dist');
const css='/life-editorial-20261106.css';
const old=['/life-modern.css','/life-compact.css','/life-global-nav.css',
  '/today-dashboard.css'];
const check=(condition,message)=>{if(!condition)throw Error('[editorial-qa] '+message);};
const read=p=>fs.readFileSync(path.join(DIST,p),'utf8');
const themeHash=createHash('sha256').update(read(css.slice(1))).digest('hex').slice(0,12);
const themeHref=css+'?v='+themeHash;
const todayHash=createHash('sha256').update(read('today-wide.css')).digest('hex').slice(0,12);
const dashboardHash=createHash('sha256').update(read('today-dashboard.js')).digest('hex').slice(0,12);
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
  check((html.match(/class="life-header-search-toggle"/g)||[]).length===1,
    'exactly one common mobile search button required '+relative);
  check(html.includes('aria-label="검색"'),
    'mobile search control must be accessible '+relative);
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
check(articles===publishedGuideCount,'all '+publishedGuideCount+' articles must remain published: '+articles);
// Runs after build-editorial-life.mjs, when unused finance CSS has been pruned.
// The separate finance-experience stylesheet is for finance/loan widgets only.
// Marketing, article and topic routes must rely on the single editorial CSS.
for(const file of ['today/index.html','car/index.html','support/index.html','events/index.html',
  'food/index.html','deals/index.html','real-estate/index.html','topics/index.html']){
  const html=read(file);
  // Today contains a real finance widget and must keep that styling.
  // Pages without finance- / loan- components must not request its CSS.
  if(!/(?:class|id)="[^"]*\b(?:finance-|loan-)/.test(html) &&
    /href="\/finance-experience\.css(?:\?[^"]*)?"/.test(html))
    check(false,'unused finance stylesheet loaded on unrelated menu: '+file);
}
for(const file of ['finance/index.html','finance/savings/index.html',
  'finance/markets/index.html','finance/loan-payment/index.html']){
  if(!/href="\/finance-experience\.css(?:\?[^"]*)?"/.test(read(file)))
    check(false,'required finance stylesheet missing: '+file);
}

const home=read('index.html');
check(home.includes('<h1>오늘 필요한 정보</h1>'),'clear functional homepage headline missing');
check(home.includes('class="hero portal-home-hero editorial-hero"'),
  'editorial home hero missing');
check(!home.includes('class="events-home-banner"') &&
  !home.includes('class="adpick-home-entry"'),
  'duplicate event/deal campaign boxes crowd the first fold');
check(!home.includes('class="life-home-intro"'),
  'redundant intro repeats the menu labels');
const heroStart=home.indexOf('<section class="hero portal-home-hero editorial-hero">');
const heroEnd=home.indexOf('</section>',heroStart);
check(heroStart>0 && heroEnd>heroStart && home.indexOf('aria-label="주요 서비스 바로가기"',heroStart)<heroEnd,
  'eight primary services must be inside homepage hero');
const keywordPattern=/<div class="portal-search-suggestions"[\s\S]*?<\/div>/;
const keyword=home.match(keywordPattern)?.[0]||'';
check(!keyword || home.indexOf(keyword)>home.indexOf('class="life-home-search-panel"'),
  'search chips must remain in the closed search panel');
check((home.match(/class="life-home-service-card"/g)||[]).length===6,
  'six focused quick routes expected');
check(!home.includes('class="life-home-more-services"'),
  'nested first-fold service drawer should be removed');
const other=home.match(/<section class="life-home-other-services"[\s\S]*?<\/section>/)?.[0]||'';
check((other.match(/<a href=/g)||[]).length===6,
  'six additional links required in full directory');
for(const route of ['/finance/markets/','/finance/mortgage-calculator/','/car/','/events/','/food/'])
  check(other.includes('href="'+route+'"'),'directory destination missing: '+route);
for(const route of ['/today/','/finance/savings/','/finance/loan-payment/',
  '/deals/','/support/','/real-estate/']) {
  check(home.includes('class="life-home-service-card" href="'+route+'"'),
    'homepage portal shortcut missing: '+route);
}
check(home.includes('class="life-home-service-grid"'),
  'compact primary grid missing');
check(home.includes('aria-label="주요 서비스 바로가기"'),
  'accessible homepage primary navigation missing');
check(home.includes('class="life-home-title-row"') &&
  home.includes('href="#life-home-other-services"'),
  'complete service directory must be linked from the first screen');
const popularAboveDirectory=home.indexOf('<section class="compact-popular"');
const directoryPosition=home.indexOf('<section class="life-home-other-services"');
check(popularAboveDirectory>0 && directoryPosition>popularAboveDirectory,
  'original editorial articles must appear before the long service list');
check(home.includes('class="life-home-search-panel" id="life-home-search"')
  && home.includes('href="#life-home-search"') && home.includes('id="portal-home-q"'),
  'search drawer or keyboard-search form broken');
check(home.includes('<details class="life-home-more-categories">'),
  'original editorial category links are not accessible');
const editorialRows=home.match(/<section class="compact-popular"[\s\S]*?<\/section>/)?.[0]||'';
check((editorialRows.match(/class="life-home-spot-thumb"/g)||[]).length===3,
  'three published editorial thumbnails missing');
check((editorialRows.match(/loading="lazy" decoding="async"/g)||[]).length===3,
  'published editorial images not rendered');
for(const marker of ['/support/basic-pension-2026/','/car/car-inspection-period/',
  '/support/housing-benefit-2026/']){
  check(editorialRows.includes('href="'+marker+'"'),'featured guide link missing: '+marker);
}
check(!editorialRows.includes('life-home-spot-thumb life-home-spot-'),
  'generic illustration tiles should be replaced with real guide images');
check(home.includes('class="life-home-tool-section"') &&
  home.includes('id="life-tool-title"'),
  'working calculator panel missing');
for(const route of ['/finance/loan-payment/','/finance/savings-calculator/','/tools/car-cost/']){
  check(home.includes('class="life-home-tool-link" href="'+route+'"'),
    'calculator entry missing: '+route);
}
const sponsorPosition=home.indexOf('<section class="modern-sponsored-area"');
const archivePosition=home.indexOf('<details class="modern-all-articles">');
check(sponsorPosition>0 && archivePosition>sponsorPosition,
  'original full-width ad section must appear before deep article archive');
const editorialStyle=read('life-editorial-20261106.css');
check(editorialStyle.includes('.life-editorial .nav-inner{display:grid;grid-template-columns:repeat(8,minmax(0,1fr))') &&
      editorialStyle.includes('.life-editorial .nav-inner{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))') &&
      editorialStyle.includes('.life-editorial.life-modern-home .main-nav{display:block}') &&
      editorialStyle.includes('.life-editorial .life-header-search-toggle{display:flex}'),
  'sitewide navigation must be one-row desktop, 4x2 mobile and visible on the homepage');
check(!editorialStyle.includes('.life-editorial.life-modern-home .header-search,.life-editorial.life-modern-home .main-nav{display:none}') &&
      !editorialStyle.includes('overflow-x:auto;scrollbar-width:none;justify-content:flex-start') &&
      !editorialStyle.includes('touch-action:pan-x;scroll-padding-inline'),
  'old home-hidden or mobile-scrolling menu CSS must be removed');

check(editorialStyle.includes('grid-template-columns:repeat(6,minmax(0,1fr))') &&
      editorialStyle.includes('width:30px;height:30px') &&
      editorialStyle.includes('font-size:var(--life-page-title-size)'),
  'desktop quick navigation and shared title scale missing');
check(editorialStyle.includes('grid-auto-rows:minmax(83px,auto)') &&
      editorialStyle.includes('--life-page-title-size:28px;--life-section-title-size:21px'),
  'mobile quick menu and common title scale missing');
check(editorialStyle.includes('grid-template-columns:1fr;gap:0') &&
  editorialStyle.includes('.life-home-tool-section') &&
  editorialStyle.includes('.life-home-spot-thumb img'),
  'editorial photo and calculator layout CSS missing');
check(editorialStyle.includes('max-width:430px') &&
  editorialStyle.includes('grid-template-columns:repeat(3,minmax(0,1fr))') &&
  editorialStyle.includes('font-size:13px'),
  'mobile three-column quick navigation not optimized');
check(editorialStyle.includes('grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(43px,auto)') &&
  editorialStyle.includes('.life-editorial .nav-inner a:nth-child(n+5){border-top:1px solid #f1f2f3}') &&
  !editorialStyle.includes('overflow-x:auto;overflow-y:hidden;scrollbar-width:none'),
  'sitewide 8-link navigation must be visible as 4x2 rows on mobile');
check(editorialStyle.includes('.life-home-tool-list{display:grid;grid-template-columns:1fr;gap:0}') &&
  editorialStyle.includes('.life-home-tool-link{min-height:77px'),
  'mobile calculators must be touch-friendly, single-column links');
check(editorialStyle.includes('grid-template-columns:repeat(6,minmax(0,1fr))'),
  'six-item desktop navigation CSS missing');
check(editorialStyle.includes('.life-home-bottom-coupang .life-coupang-widget') &&
  editorialStyle.includes('max-width:none'),
  'bottom Coupang widget must fill the mobile width');
check(editorialStyle.includes('--brand:#e95731;--brand-dark:#e95731;--brand-soft:#f5f6f7;') &&
  editorialStyle.includes('life-home-all-link'),
  'single restrained orange accent not configured');
check((home.match(/class="portal-topic-card compact-topic"/g)||[]).length===6,
  'six original topic links lost');
check(home.includes('<details class="compact-explore compact-latest" open>'),
  'recently updated original articles still hidden');
check((home.match(/data-affiliate="tenping-/g)||[]).length===2,
  'affiliate density must stay reduced on homepage');
check((home.match(/data-life-coupang-banner="sitewide-v4"/g)||[]).length===1,
  'homepage must show exactly one Coupang banner');
check((home.match(/data-life-coupang-kind="body"/g)||[]).length===1 &&
      !home.includes('data-life-coupang-kind="middle"') &&
      !home.includes('data-life-coupang-kind="rail"'),
  'homepage must not retain original duplicate placements');
check(home.includes('class="life-coupang-placement life-coupang-placement--body life-home-bottom-coupang"'),
  'bottom-only Coupang placement missing');
check(home.indexOf('life-home-bottom-coupang')>home.indexOf('<details class="modern-all-articles"') &&
      home.indexOf('life-home-bottom-coupang')<home.lastIndexOf('</main>'),
  'Coupang must be at the end of main content');
check((home.match(/new PartnersCoupang\.G\(options\)/g)||[]).length===1,
  'Coupang widget initialized more than once');
check(home.includes('options.height=window.matchMedia("(max-width:700px)").matches?"320":"380";'),
  'original responsive Coupang dimensions must be retained');
for(const name of ['car','support']){
  const html=read(name+'/index.html');
  check(html.includes('id="modern-article-list"')&&html.includes('id="modern-list-filter"'),
    'category article discovery/search missing: '+name);
}
const today=read('today/index.html');
check(today.includes('class="today-viewport"')&&
  today.includes('class="today-vertical-list today-dashboard-grid editorial-desk"'),
  'Today first-screen dashboard missing');
check(!today.includes('class="today-section-nav"') &&
  today.includes('id="today-weather"') &&
  today.includes('id="today-news"'),
  'Today weather/news hierarchy or duplicate tabs incorrect');
const todaySheet='<link rel="stylesheet" href="/today-wide.css?v='+todayHash+'">';
const generalSheet='<link rel="stylesheet" href="'+themeHref+'">';
check(today.indexOf(todaySheet)>today.indexOf(generalSheet),
  'Today-only layout must load after the global stylesheet');
for(const filename of ['today/index.html','finance/markets/index.html']){
  const page=read(filename);
  check(page.includes('src="/today-dashboard.js?v='+dashboardHash+'"'),
    'Current client-side quote renderer must be cache-busted: '+filename);
}
const wideDashboard=read('today-wide.css');
check(wideDashboard.includes('max-width:var(--content)') &&
  wideDashboard.includes('grid-template-areas:"weather news" "fx news" "crypto crypto"') &&
  wideDashboard.includes('grid-template-areas:"weather" "news" "fx" "crypto"'),
  'Today desktop and mobile layouts must have separate information priorities');
const positions=['data-today-weather','data-today-news',
  'data-today-fx','data-today-crypto'].map(k=>today.indexOf(k));
check(positions.every((p,i)=>p>=0&&(i===0||p>positions[i-1])),
  'Today section priority changed');
check(today.includes('data-today-fx')&&!today.includes('data-today-stocks'),
  'Today stocks must be replaced by daily exchange rates');
check(today.includes('data-fx-items') &&
  today.includes('>환율</h3>') &&
  today.includes('https://www.ecb.europa.eu/') &&
  !today.includes('>증권</h3>'),
  'Today reference FX panel missing or stock panel still visible');
for(const target of ['https://www.yna.co.kr/','https://www.weather.go.kr/',
  'https://upbit.com/','https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html']){
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
console.log('[editorial-qa] PASS '+checked+' pages, '+publishedGuideCount+' fully open articles, one stylesheet, 4 live info sources, original ads, finance/calculator and canonical links.');
