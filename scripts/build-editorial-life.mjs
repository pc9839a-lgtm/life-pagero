import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// The sole final presentation pass. Older incremental theme stylesheets are
// disconnected from generated HTML; this stylesheet owns the whole visual
// system. Keep original posts, prices, routes, links, sponsor markup and SEO.
const DIST=path.resolve('dist');
const CSS='/life-editorial-20261106.css';
// The actual CSS content hash changes when any style changes, preventing stale
// Cloudflare/browser caching without creating another cascading stylesheet.
const CSS_HASH=createHash('sha256').update(fs.readFileSync(path.join(DIST,CSS.slice(1)))).digest('hex').slice(0,12);
const CSS_HREF=CSS+'?v='+CSS_HASH;
const oldStyles=[
  '/life-modern.css','/life-compact.css','/life-global-nav.css',
  '/today-dashboard.css','/today-wide.css'
];
const read=name=>fs.readFileSync(path.join(DIST,name),'utf8');
const write=(name,html)=>fs.writeFileSync(path.join(DIST,name),html);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
  const name=path.join(dir,item.name);
  return item.isDirectory()?walk(name):[name];
});
const check=(condition,message)=>{if(!condition)throw Error('[editorial-ui] '+message);};
const removeOldStyles=html=>{
  for(const href of oldStyles){
    const marker='<link rel="stylesheet" href="'+href+'">';
    html=html.replaceAll(marker,'');
  }
  return html;
};
const transformHome=html=>{
  check(html.includes('<section class="hero portal-home-hero">'),'home search hero missing');
  check(html.includes('id="portal-home-q"'),'working search form missing');
  check((html.match(/class="portal-topic-card compact-topic"/g)||[]).length===6,
    'existing six topic destinations missing');
  html=html.replace('<section class="hero portal-home-hero">',
    '<section class="hero portal-home-hero editorial-hero">');
  html=html.replace('<h1>무엇을 찾고 계신가요?</h1>','<h1>오늘 필요한 정보</h1>');
  html=html.replace('<h2 id="portal-topic-title">분야별 찾기</h2>',
    '<h2 id="portal-topic-title">분야별 정보</h2>');
  html=html.replace('<h2 id="compact-popular-title">많이 찾는 정보</h2>',
    '<h2 id="compact-popular-title">주요 생활정보</h2>');
  const latest='<details class="compact-explore compact-latest">';
  check(html.includes(latest),'home recently updated posts missing');
  // Readers should not need to open an accordion to see actual articles.
  html=html.replace(latest,'<details class="compact-explore compact-latest" open>');
  html=html.replace('<summary>최근 등록된 글 보기</summary>',
    '<summary>최근 업데이트</summary>');
  check(html.includes('<details class="modern-all-articles">'),
    'full existing article archive missing');
  return html;
};
const transformArticle=(html,relative)=>{
  const opening='<details id="compact-full-guide" class="compact-full-guide">';
  check(html.includes(opening),'article body disclosure missing: '+relative);
  // Make the entire editorial article readable on arrival. The collapse
  // remains an accessible native control, and all body text is unchanged.
  html=html.replace(opening,
    '<details id="compact-full-guide" class="compact-full-guide" open>');
  html=html.replace('<summary>본문 <span aria-hidden="true">⌄</span></summary>',
    '<summary>본문 접기·펼치기 <span aria-hidden="true">⌄</span></summary>');
  return html;
};
const transformToday=html=>{
  check(html.includes('class="today-viewport"') &&
    html.includes('class="today-wide-content"'),'full-width Today wrappers missing');
  check(html.includes('data-today-news') && html.includes('data-today-weather') &&
    html.includes('data-today-stocks') && html.includes('data-today-crypto'),
    'Today API elements missing');
  return html.replace('class="today-vertical-list"','class="today-vertical-list editorial-desk"');
};
const transformCategory=(html,relative)=>{
  check(html.includes('id="modern-article-list"'),'category article list missing '+relative);
  check(html.includes('id="modern-list-filter"'),'category search missing '+relative);
  return html;
};
let pages=0,articles=0;
for(const absolute of walk(DIST).filter(file=>file.endsWith('.html'))){
  const relative=path.relative(DIST,absolute).replaceAll(path.sep,'/');
  let html=fs.readFileSync(absolute,'utf8');
  if(!html.includes('class="life-modern '))continue;
  const original=html;
  if(relative==='index.html')html=transformHome(html);
  else if(relative==='today/index.html')html=transformToday(html);
  else if(relative==='car/index.html'||relative==='support/index.html')
    html=transformCategory(html,relative);
  else if(/^(?:car|support)\/[^/]+\/index\.html$/.test(relative)){
    html=transformArticle(html,relative);articles++;
  }
  html=removeOldStyles(html);
  html=html.replace('class="life-modern ','class="life-modern life-editorial ');
  html=html.replace('</head>','<link rel="stylesheet" href="'+CSS_HREF+'"></head>');
  check((html.match(/<link rel="canonical"/g)||[]).length===1,
    'canonical lost: '+relative);
  check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
    'H1 count changed: '+relative);
  check(html.includes('href="'+CSS_HREF+'"'),'new versioned stylesheet missing: '+relative);
  check(!oldStyles.some(href=>html.includes('href="'+href+'"')),
    'conflicting old theme remains: '+relative);
  if(html!==original)fs.writeFileSync(absolute,html);
  pages++;
}
check(pages>=150,'site page coverage unexpectedly low '+pages);
check(articles===46,'must keep all 46 original article pages '+articles);
console.log('[editorial-ui] '+pages+' pages rebuilt with one style system; '+articles+' full articles expanded, newsroom + directory preserved.');
