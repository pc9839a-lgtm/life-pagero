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
console.log('[today-qa] /today/ source-backed widgets, minimal homepage, verified source links, finance embeds, SEO, ads and search passed.');
