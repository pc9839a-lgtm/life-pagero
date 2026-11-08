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
const TODAY_HASH=createHash('sha256')
  .update(fs.readFileSync(path.join(DIST,'today-wide.css'))).digest('hex').slice(0,12);
const DASHBOARD_HASH=createHash('sha256')
  .update(fs.readFileSync(path.join(DIST,'today-dashboard.js'))).digest('hex').slice(0,12);

const MENU_STYLES=['events-ui.css','real-estate.css','adpick-deals.css',
  'life-food.css','finance-experience.css'];
const MENU_STYLE_HASHES=MENU_STYLES.map(name=>[name,createHash('sha256')
  .update(fs.readFileSync(path.join(DIST,name))).digest('hex').slice(0,12)]);
const versionMenuStyles=html=>{
  for(const [name,hash] of MENU_STYLE_HASHES){
    const prefix='<link rel="stylesheet" href="/'+name;
    // Replace an old fixed version (or unversioned href), not add CSS.
    const regexp=new RegExp('(<link rel="stylesheet" href="/'+
      name.replaceAll('.','\\.')+')(?:\\?[^"]*)?(")','g');
    html=html.replace(regexp,(_all,start,quote)=>start+'?v='+hash+quote);
  }
  return html;
};
const oldStyles=[
  '/life-modern.css','/life-compact.css','/life-global-nav.css',
  '/today-dashboard.css'
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
    '<section class="hero portal-home-hero editorial-hero"><span class="life-home-kicker">LIFE PORTAL</span>');
  html=html.replace('<h1>무엇을 찾고 계신가요?</h1>','<h1>오늘 필요한 정보</h1>');
  html=html.replace('<h2 id="portal-topic-title">분야별 찾기</h2>',
    '<h2 id="portal-topic-title">분야별 정보</h2>');
  html=html.replace('<h2 id="compact-popular-title">많이 찾는 정보</h2>',
    '<h2 id="compact-popular-title">주요 생활정보</h2>');

  // The supplied 4 × 3 reference is the homepage layout contract, not a card gallery.
  // All twelve destinations are existing pages; content, tracking and sponsored links remain unchanged.
  const services=[
    {href:'/today/',label:'날씨',icon:'<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/><circle cx="12" cy="12" r="4"/>'},
    {href:'/finance/markets/',label:'증권',icon:'<path d="m3 17 7-7 4 4 7-8M15 6h6v6"/>'},
    {href:'/finance/markets/',label:'코인',icon:'<path d="M10 3v18M14 3v18M7 7h8a3 3 0 0 1 0 6H8h8a3 3 0 0 1 0 6H7"/>'},
    {href:'/finance/loan-payment/',label:'계산기',icon:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2"/>'},
    {href:'/food/',label:'먹거리',icon:'<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M16 21V3c3 2 4 6 4 10h-4"/>'},
    {href:'/finance/savings/',label:'금리비교',icon:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>'},
    {href:'/deals/',label:'핫딜',icon:'<path d="M5 8h14l1 13H4L5 8ZM9 9V6a3 3 0 0 1 6 0v3"/>'},
    {href:'/finance/mortgage-calculator/',label:'주택대출',icon:'<path d="m3 10 9-7 9 7v10H3V10ZM9 20v-7h6v7"/>'},
    {href:'/car/',label:'자동차',icon:'<path d="m5 11 1.5-5h11L19 11M4 11h16v8H4zM4 16h16M7 15h2M15 15h2M6 19v2M18 19v2"/>'},
    {href:'/support/',label:'지원금',icon:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M12 6v15M3 11h18M10 6c-6-1-6-6-3-6 2 0 5 4 5 6ZM14 6c6-1 6-6 3-6-2 0-5 4-5 6Z"/>'},
    {href:'/events/',label:'축제·행사',icon:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18M8 15h3"/>'},
    {href:'/real-estate/',label:'분양정보',icon:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'}
  ];
  // Editorial first, navigation second: a single six-item discoverability row.
  // All other services remain linked in a lower page directory, not a nested drawer.
  const primaryOrder=['날씨','금리비교','계산기','지원금','핫딜','분양정보'];
  const primary=primaryOrder.map(label=>services.find(item=>item.label===label));
  const secondary=services.filter(item=>!primaryOrder.includes(item.label));
  check(primary.length===6&&primary.every(Boolean)&&secondary.length===6,
    'six first-fold navigation links and six directory links required');
  const serviceLinks=primary.map(item=>'<a class="life-home-service-card" href="'+item.href+'">'
    +'<span class="life-home-service-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+item.icon+'</svg></span>'
    +'<span class="life-home-service-copy"><strong>'+item.label+'</strong></span></a>').join('');
  const grid='<nav class="life-home-service-grid" aria-label="주요 서비스 바로가기">'+serviceLinks+'</nav>';
  const otherLinks=secondary.map(item=>'<a href="'+item.href+'">'+item.label+
    '<span aria-hidden="true">›</span></a>').join('');
  const more='<section class="life-home-other-services" id="life-home-other-services" aria-labelledby="life-home-other-title">'
    +'<div class="life-home-section-heading"><h2 id="life-home-other-title">다른 서비스</h2></div>'
    +'<nav class="life-home-more-links" aria-label="다른 서비스 바로가기">'+otherLinks+'</nav></section>';
  check((serviceLinks.match(/class="life-home-service-card"/g)||[]).length===6,
    'six primary navigation links required');
  check((otherLinks.match(/<a href=/g)||[]).length===6,
    'six additional service links required');
  // Preserve the working site search, but show it only when the header search control is selected.
  html=html.replace('<span class="life-home-kicker">LIFE PORTAL</span>','');
  html=html.replace('<h1>오늘 필요한 정보</h1>',
    '<div class="life-home-title-row"><h1>오늘 필요한 정보</h1><a href="#life-home-other-services" class="life-home-all-link">전체 서비스 <span aria-hidden="true">›</span></a></div>');

  // The icon labels provide the navigation context; no redundant subtitle.

  // Secondary campaign promos duplicated the actual destination grid and consumed
  // the first screen. Their /events/ and /deals/ routes stay in the icon menu.
  html=html.replace(/<section class="events-home-banner"[^>]*>[\s\S]*?<\/section>/,'');
  html=html.replace(/<section class="adpick-home-entry"[^>]*>[\s\S]*?<\/section>/,'');
  check(!html.includes('class="events-home-banner"') &&
        !html.includes('class="adpick-home-entry"'),
    'duplicate promotional homepage banners still take the first viewport');
  // Search suggestion chips are only useful when the search drawer is open.
  const suggestions=html.match(/<div class="portal-search-suggestions"[\s\S]*?<\/div>/)?.[0]||'';
  if(suggestions)html=html.replace(suggestions,'');
  const searchForm=html.match(/<form class="portal-home-search"[\s\S]*?<\/form>/)?.[0];
  check(searchForm && searchForm.includes('id="portal-home-q"'),'original search form must exist');
  html=html.replace(searchForm,'<div class="life-home-search-panel" id="life-home-search">'+searchForm+suggestions+'</div>');
  const heroMatch=html.match(/<section class="hero portal-home-hero editorial-hero">[\s\S]*?<\/section>/)?.[0];
  check(heroMatch,'hero markup missing');
  html=html.replace(heroMatch,heroMatch.replace('</section>',grid+'</section>'));
  // The global navigation pass already placed the same mobile search control
  // on every page. Keep the original local home search panel as its target.
  check(html.includes('class="life-header-search-toggle" href="#life-home-search"'),
    'homepage must retain the same global mobile search control');

  // Existing six editorial destinations are retained in an expandable area,
  // instead of repeating another 6-card menu above the editorial feed.
  const topicAnchor='<section class="portal-home-section" aria-labelledby="portal-topic-title">';
  const topicStart=html.indexOf(topicAnchor);
  const popularStart=html.indexOf('<section class="compact-popular"',topicStart);
  check(topicStart>0 && popularStart>topicStart,'topic/popular sequence missing');
  const topicSection=html.slice(topicStart,popularStart);
  check((topicSection.match(/class="portal-topic-card compact-topic"/g)||[]).length===6,
    'six existing editorial topics must be preserved');
  html=html.slice(0,topicStart)+html.slice(popularStart);
  const categoryDrawer='<details class="life-home-more-categories"><summary>생활정보 분야 더보기</summary>'
    +topicSection+'</details>';
  const archiveAnchor='<details class="modern-all-articles">';
  check(html.includes(archiveAnchor),'article archive missing');
  html=html.replace(archiveAnchor,categoryDrawer+archiveAnchor);

  // Use the published editorial articles' actual photos. Do not invent generic
  // stock-like graphic placeholders: the same image is already used in each guide.
  const escAttr=x=>String(x??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const guidePhoto=(category,slug)=>{
    const file=path.resolve('content/posts',category,slug+'.json');
    check(fs.existsSync(file),'published guide photo source missing '+slug);
    const post=JSON.parse(fs.readFileSync(file,'utf8'));
    const photo=post.series?.parts?.[0]?.image;
    check(/^https:\/\//.test(photo||''),'published guide photo missing '+slug);
    return {src:photo,alt:post.series.parts[0].imageAlt||post.title};
  };
  const spotlight=[
    {href:'/support/basic-pension-2026/',title:'2026 기초연금 대상 확인',sub:'신청 조건과 선정기준액',photo:guidePhoto('support','basic-pension-2026')},
    {href:'/car/car-inspection-period/',title:'자동차 검사기간 조회',sub:'정기·종합검사 확인 방법',photo:guidePhoto('car','car-inspection-period')},
    {href:'/support/housing-benefit-2026/',title:'2026 주거급여 신청 조건',sub:'소득 기준과 신청 방법',photo:guidePhoto('support','housing-benefit-2026')}
  ];
  const spotlightList=spotlight.map(item=>'<li><a href="'+item.href+'">'
    +'<span class="life-home-spot-thumb"><img src="'+escAttr(item.photo.src)+'" alt="'+escAttr(item.photo.alt)+'" width="120" height="120" loading="lazy" decoding="async"></span>'
    +'<span class="life-home-spot-copy"><strong>'+item.title+'</strong><small>'+item.sub+'</small></span>'
    +'<span class="life-home-spot-arrow" aria-hidden="true">›</span></a></li>').join('');
  const popPattern=/(<section class="compact-popular"[\s\S]*?<ul>)[\s\S]*?(<\/ul><\/section>)/;
  check(popPattern.test(html),'original home editorial picks missing');
  html=html.replace(popPattern,'$1'+spotlightList+'$2');
  html=html.replace('>주요 생활정보</h2>','>지금 확인할 생활정보</h2>');

  // Actual working calculators, not an invented statistics/benefits showcase.
  const tools=[
    {href:'/finance/loan-payment/',title:'대출 이자 계산',description:'월 상환액 · 총이자'},
    {href:'/finance/savings-calculator/',title:'적금 만기 계산',description:'납입액 · 이자 · 세후 수령액'},
    {href:'/tools/car-cost/',title:'자동차 유지비',description:'주행거리 · 연료비 · 유지비'}
  ];
  const toolLinks=tools.map((item,index)=>'<a class="life-home-tool-link" href="'+item.href+'">'
    +'<span class="life-home-tool-number">0'+(index+1)+'</span>'
    +'<span class="life-home-tool-copy"><strong>'+item.title+'</strong><small>'+item.description+'</small></span>'
    +'<span class="life-home-tool-chevron" aria-hidden="true">↗</span></a>').join('');
  const toolSection='<section class="life-home-tool-section" aria-labelledby="life-tool-title">'
    +'<div class="life-home-section-heading"><h2 id="life-tool-title">생활 계산기</h2><a href="/finance/">금융 전체보기 <span aria-hidden="true">›</span></a></div>'
    +'<div class="life-home-tool-list">'+toolLinks+'</div></section>';
  // Keep the full service directory below the actual content and tools.
  const lowerNavAnchor='<details class="compact-explore compact-latest"';
  check(html.includes(lowerNavAnchor),'latest article section missing for directory');
  html=html.replace(lowerNavAnchor,more+lowerNavAnchor);
  const toolAnchor='<details class="compact-explore compact-latest"';
  check(html.includes(toolAnchor),'latest articles missing for tool placement');
  html=html.replace(toolAnchor,toolSection+toolAnchor);

  // Move existing labelled ads above the deep archive, not below every other block.
  const sponsorOpen='<section class="modern-sponsored-area" aria-label="광고 및 제휴">';
  const sponsorStart=html.indexOf(sponsorOpen);
  const sponsorClose='</section></div><aside class="sidebar">';
  const sponsorEnd=html.indexOf(sponsorClose,sponsorStart);
  check(sponsorStart>0 && sponsorEnd>sponsorStart,'sponsored section boundary missing');
  const sponsorSection=html.slice(sponsorStart,sponsorEnd+'</section>'.length);
  html=html.slice(0,sponsorStart)+html.slice(sponsorEnd+'</section>'.length);
  const sponsorTarget='<details class="modern-all-articles">';
  check(html.includes(sponsorTarget),'cannot relocate preserved sponsors');
  html=html.replace(sponsorTarget,sponsorSection+sponsorTarget);
  check((html.match(/data-affiliate="tenping-/g)||[]).length===4,'sponsored cards must not be lost');

  const latest='<details class="compact-explore compact-latest">';
  check(html.includes(latest),'home recently updated posts missing');
  // Readers should not need to open an accordion to see actual articles.
  html=html.replace(latest,'<details class="compact-explore compact-latest" open>');
  html=html.replace('<summary>최근 등록된 글 보기</summary>',
    '<summary>최근 업데이트</summary>');
  check(html.includes('<details class="modern-all-articles">'),
    'full existing article archive missing');
  // The homepage has three Coupang placements in the source build:
  // two inline + one sidebar. Keep exactly the original publisher-configured
  // body widget, relocate it below the page content, and remove the duplicates.
  // All non-home pages retain their source advertising layout unchanged.
  const coupangBlocks=[...html.matchAll(/<aside class="life-coupang-placement\b[^>]*>[\s\S]*?<\/aside>/g)];
  check(coupangBlocks.length===3,'homepage must start with 3 original Coupang units');
  const bottomCoupang=coupangBlocks.map(m=>m[0]).find(block=>
    block.includes('data-life-coupang-kind="body"'));
  check(bottomCoupang && bottomCoupang.includes('data-life-coupang-banner="sitewide-v4"'),
    'original publisher Coupang widget missing');
  for(const match of coupangBlocks)html=html.replace(match[0],'');
  const bottomAd=bottomCoupang.replace(
    'class="life-coupang-placement life-coupang-placement--body"',
    'class="life-coupang-placement life-coupang-placement--body life-home-bottom-coupang"');
  check(html.includes('</main>'),'homepage footer ad destination missing');
  html=html.replace('</main>',bottomAd+'</main>');
  check((html.match(/data-life-coupang-banner="sitewide-v4"/g)||[]).length===1,
    'homepage Coupang must appear once only');
  check(html.indexOf('life-home-bottom-coupang')>html.indexOf('class="modern-all-articles"'),
    'homepage Coupang must remain at bottom after the content');
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
    html.includes('data-today-fx') && html.includes('data-today-crypto'),
    'Today API elements missing');
  return html.replace('class="today-vertical-list today-dashboard-grid"','class="today-vertical-list today-dashboard-grid editorial-desk"');
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
  html=versionMenuStyles(html);
  html=html.replace('class="life-modern ','class="life-modern life-editorial ');
  html=html.replace('</head>','<link rel="stylesheet" href="'+CSS_HREF+'"></head>');
  if(relative==='today/index.html'||relative==='finance/markets/index.html'){
    const oldJs='src="/today-dashboard.js"';
    check(html.includes(oldJs),'Today quote loader missing: '+relative);
    html=html.replace(oldJs,'src="/today-dashboard.js?v='+DASHBOARD_HASH+'"');
  }
  if(relative==='today/index.html'){
    // The dedicated Today layout must be loaded after the global editorial
    // design system; no changes to finance/markets or other shared widgets.
    const todaySheet='<link rel="stylesheet" href="/today-wide.css">';
    check(html.includes(todaySheet),'Today-only stylesheet missing');
    const todayVersioned='<link rel="stylesheet" href="/today-wide.css?v='+TODAY_HASH+'">';
    html=html.replace(todaySheet,'').replace('</head>',todayVersioned+'</head>');
  }
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
