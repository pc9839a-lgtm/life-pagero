import fs from 'node:fs';
import path from 'node:path';
const DIST=path.resolve('dist');
const read=p=>fs.readFileSync(path.join(DIST,p),'utf8');
const yes=(value,message)=>{if(!value)throw Error('[today-qa] '+message);};
const home=read('index.html');
const today=read('today/index.html');
const markets=read('finance/markets/index.html');
const sitemap=read('sitemap.xml');
yes(!home.includes('class="today-glance"')&&!home.includes('data-today-weather'),
  'homepage must remain six icons and three links; today widgets belong on /today/');
yes((home.match(/class="portal-topic-card compact-topic"/g)||[]).length===6,
  '6 established compact home categories changed');
yes((home.match(/data-life-coupang-kind="(?:body|middle)"/g)||[]).length===2,
  'existing homepage body advertising count changed');
yes((home.match(/data-life-coupang-kind="rail"/g)||[]).length===1,
  'sidebar advertising count changed');
yes((home.match(/data-affiliate="tenping-/g)||[]).length===4,
  'existing affiliate card placement changed');
yes(home.includes('class="modern-sponsored-area"'),
  'existing advertisements lost');
yes((home.match(/href="\/today\/"/g)||[]).length>=1,
  'home not linked to today page');
for(const [name,html,canonical] of [
  ['home',home,'https://pagero.kr/life/'],
  ['today',today,'https://pagero.kr/life/today/'],
  ['market',markets,'https://pagero.kr/life/finance/markets/']
]){
  yes((html.match(/<link rel="canonical"/g)||[]).length===1,
    name+' must have exactly one canonical');
  yes(html.includes('<link rel="canonical" href="'+canonical+'">'),
    name+' canonical changed');
  yes((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
    name+' must have one H1');
  if(name!=='home'){
    yes(html.includes('href="/today-dashboard.css"'),
      name+' dashboard CSS missing');
    yes(html.includes('src="/today-dashboard.js"'),
      name+' dashboard client missing');
  }else{
    yes(!html.includes('src="/today-dashboard.js"'),
      'homepage should not load unused finance/weather dashboard JS');
  }
  yes(html.includes('name="robots" content="index,follow'),
    name+' indexability changed');
}
yes(today.includes('data-news-filter')&&today.includes('data-weather-city'),
  'full page must allow weather city and news category selection');

yes(today.includes('class="today-viewport"') &&
  today.includes('class="today-wide-content"'),
  'Today screen must use isolated full-viewport wrappers');
yes(!today.includes('class="site-shell today-shell"') &&
  !today.includes('class="portal-page finance-page today-page"'),
  'Old 890px site-shell/portal-page wrapper still constrains Today screen');
yes(today.includes('class="today-vertical-list today-dashboard-grid"')&&!today.includes('class="today-full-grid"'),
  'Today needs a coherent first-screen dashboard without the old card grid');
const order=['data-today-weather','data-today-news','data-today-fx','data-today-crypto']
  .map(key=>today.indexOf(key));
yes(order.every((position,index)=>position>=0&&(index===0||position>order[index-1])),
  'Weather, news, exchange rates and crypto must follow editorial priority');
const dashboardCss=read('today-dashboard.css');
const wideCss=read('today-wide.css');
yes(wideCss.includes('#main-content>.today-viewport') &&
  wideCss.includes('width:100%') && wideCss.includes('max-width:none'),
  'Today dedicated stylesheet must use 100% viewport with no max-width cap');
yes(today.includes('href="/today-wide.css"'),
  'New uncached full-viewport CSS is not linked from Today page');
for(const id of ['weather','news','fx','crypto']){
  yes(today.includes('id="today-'+id+'"'),
    'information section anchor missing: '+id);
}
yes(!today.includes('class="today-section-nav"') &&
  today.includes('class="today-page-head"'),
  'remove the redundant anchor tab row to expose live information');
yes(wideCss.includes('max-width:1360px') &&
  wideCss.includes('grid-template-areas:"weather news" "fx news" "crypto crypto"') &&
  wideCss.includes('@media(max-width:350px)') &&
  wideCss.includes('grid-template-areas:"weather" "news" "fx" "crypto"'),
  'desktop first-fold dashboard or single-column mobile layout missing');
yes(today.includes('data-today-fx')&&today.includes('data-fx-items') &&
  today.includes('>환율</h3>') && !today.includes('data-today-stocks'),
  'Today should replace stocks with exchange rates only');
yes(today.includes('https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html'),
  'ECB currency reference source link missing');
yes(!today.includes('class="today-fx-value"') &&
  today.includes('마지막 발표 영업일'),
  'Do not hardcode exchange rate numbers in public HTML');
yes(wideCss.includes('.today-fx-list') &&
  wideCss.includes('grid-template-columns:repeat(2,minmax(0,1fr))') &&
  wideCss.includes('.today-fx-list{grid-template-columns:1fr;gap:0}'),
  'Desktop and mobile reference FX layout missing');
const fxFunction=read('today-dashboard.js');
yes(fxFunction.includes("get('today/api/fx')") &&
  fxFunction.includes("document.querySelectorAll('[data-today-fx]').forEach(fx)"),
  'Today browser must fetch and render the four reference rates');
yes(!markets.includes('href="/today-wide.css"'),
  'Today-only viewport override leaked into another page');
yes(dashboardCss.includes('.today-vertical-list{display:flex;flex-direction:column'),
  'Today page must stack full-width blocks on desktop and mobile');
const dashboardJs=read('today-dashboard.js');
yes(dashboardJs.includes('news more')===false&&dashboardJs.includes('today-expand-button') &&
  dashboardJs.includes("const limit=node.dataset.mode==='compact'?5:4;"),
  'Four concise headlines and expandable full list missing');
yes(dashboardJs.includes('today-source-prompt') &&
  dashboardJs.includes('attachRefresh(node,load)') &&
  dashboardJs.includes('control.addEventListener(\'click\',load)'),
  'visible error fallback or functional refresh missing');

yes(today.includes('언론사 원문')&&today.includes('articles')===false,
  'full page should link to original stories without copied body');
yes((today.match(/data-life-coupang-kind="body"/g)||[]).length===1,
  'new page must preserve one existing clearly-labeled ad slot');
yes(markets.includes('class="today-market-inserts"'),'stock and crypto missing from markets');
yes(markets.includes('id="finance-issues"'),'existing DART/policy issues lost');
yes(sitemap.includes('<loc>https://pagero.kr/life/today/</loc><lastmod>2026-11-05</lastmod>'),
  'today route missing from sitemap');
const index=JSON.parse(read('search-index.json'));
yes(index.some(x=>x.url==='/today/'),'today page missing from local search');
yes(!index.some(x=>x.url.includes('today/api')),'API must never be in public search');
for(const name of ['today-dashboard.css','today-dashboard.js']){
  yes(fs.statSync(path.join(DIST,name)).size>2500,'dashboard asset not generated: '+name);
}
console.log('[today-qa] /today/ weather, news, FX, crypto; finance/markets stocks unchanged; SEO, ads and mobile passed.');
