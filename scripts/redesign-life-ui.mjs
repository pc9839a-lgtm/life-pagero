import fs from 'node:fs';
import path from 'node:path';

const DIST=path.resolve('dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const target=path.join(dir,entry.name);
  return entry.isDirectory()?walk(target):[target];
});
const icons={
  '금융·세금':'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  '지원금·복지':'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  '주거·부동산':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-8h6v8"/>',
  '자동차':'<path d="m5 11 1.5-5h11L19 11M4 11h16v8H4zM4 16h16M7 15h2M15 15h2M6 19v2M18 19v2"/>',
  '취업·노동':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12a24 24 0 0 0 18 0M10 12v2h4v-2"/>',
  '생활·건강':'<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/>'
};
const icon=label=>'<span class="modern-topic-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="presentation">'+(icons[label]||icons['생활·건강'])+'</svg></span>';
const check=(condition,message)=>{if(!condition)throw Error('[modern-ui] '+message)};
function moveBlock(html,regex,moved){
  return html.replace(regex,block=>{moved.push(block);return '';});
}
function redesignHome(html){
  html=html.replace('<div class="site-shell">','<div class="site-shell home-shell">')
    .replace('<div class="content-grid">','<div class="content-grid home-grid">');
  check(html.includes('class="hero portal-home-hero"'),'home search hero missing');
  html=html.replace('<section class="hero portal-home-hero">',
    '<section class="hero portal-home-hero"><span class="modern-eyebrow">생활비서 · 생활정보 검색</span>');
  html=html.replace('<h1>생활에 필요한 정보, 바로 찾아보세요.</h1>',
    '<h1>복잡한 생활정보,<br>쉽게 찾아보세요.</h1>');
  html=html.replace(
    /<section class="portal-topic-card" aria-label="([^"]+)">/g,
    (fragment,label)=>fragment+icon(label)
  );
  check((html.match(/class="modern-topic-icon"/g)||[]).length===6,
    'all six subjects must have helpful icons');
  html=html.replace('<section class="section life-pathways" aria-label="주제별 글">',
    '<section class="section life-pathways" aria-label="상황별로 찾아보기">'+
    '<div class="modern-section-heading"><h2>상황별로 찾아보기</h2><p>필요한 일부터 선택해 보세요.</p></div>');
  // The separate updates list repeats the verified latest-article cards and
  // needlessly extends the landing page. Keep the full article archive below.
  html=html.replace(/<section class="portal-home-section portal-updates"[\s\S]*?<\/section>/,'');
  // Preserve every sponsor with its identifiers, script and disclosure. Move
  // it after editorial navigation and articles so information comes first.
  const sponsored=[];
  html=moveBlock(html,
    /<div class="life-affiliate-placement life-affiliate-placement--top">[\s\S]*?<\/aside><\/div>/,
    sponsored);
  html=moveBlock(html,
    /<section class="section life-sponsor-collection[^"]*"[^>]*>[\s\S]*?<\/section>/,
    sponsored);
  html=moveBlock(html,
    /<aside class="life-coupang-placement life-coupang-placement--(?:middle|body)"[\s\S]*?<\/aside>/g,
    sponsored);
  check(sponsored.length===3,'expected two lower affiliate blocks and two original Coupang body units in three wrappers; got '+sponsored.length);

  const archiveStart=html.indexOf('<section class="section life-archive"');
  check(archiveStart>=0,'sitewide archive missing');
  const archiveEnd=html.indexOf('</div></section>',archiveStart);
  check(archiveEnd>archiveStart,'archive end marker missing');
  const end=archiveEnd+'</div></section>'.length;
  const archive=html.slice(archiveStart,end);
  const wrapped='<details class="modern-all-articles"><summary>전체 글 목록 펼쳐보기</summary>'+
    archive+'</details>';
  html=html.slice(0,archiveStart)+wrapped+html.slice(end);

  const rail='<aside class="sidebar">';
  const anchor='</div>'+rail;
  check(html.includes(anchor),'home main/sidebar wrapper missing');
  const sponsorBlock='<section class="modern-sponsored-area" aria-label="광고 및 제휴">'+
    '<div class="modern-section-heading"><h2>광고 · 제휴</h2></div>'+
    sponsored.join('')+'</section>';
  html=html.replace(anchor,sponsorBlock+'</div>'+rail);
  check(html.includes('data-life-affiliate-layout="wide-v2"'),'affiliate version marker lost');
  return html;
}
function redesignCategory(html, category){
  html=html.replace('<div class="content-grid">','<div class="content-grid modern-category-grid">');
  const count=(html.match(/<article class="post-card">/g)||[]).length;
  check(count>0,category+' has no article cards');
  const field='<div class="modern-list-toolbar">'+
    '<span class="modern-count" id="modern-list-count">'+count+'개의 글</span>'+
    '<label class="sr-only" for="modern-list-filter">이 목록에서 글 검색</label>'+
    '<input class="modern-list-filter" id="modern-list-filter" type="search" placeholder="이 목록에서 검색" autocomplete="off" aria-controls="modern-article-list">'+
    '</div>';
  html=html.replace('<div class="post-list">',field+
    '<div id="modern-article-list" class="post-list">');
  check(html.includes('id="modern-article-list"'),'list filter target missing');
  html=html.replace('</div></section></div><aside class="sidebar">',
    '<p id="modern-list-empty" class="modern-empty" hidden>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p></div></section></div><aside class="sidebar">');

  // Related sponsor cards stay clearly marked, but below the article list.
  const moved=[];
  html=moveBlock(html,
    /<section class="section life-sponsor-collection[^"]*"[^>]*>[\s\S]*?<\/section>/,
    moved);
  check(moved.length===1,'category sponsor block missing: '+category);
  html=html.replace('</div><aside class="sidebar">',
    '<div class="modern-sponsored-area">'+moved.join('')+'</div></div><aside class="sidebar">');
  return html;
}
function decorate(file){
  const relative=path.relative(DIST,file).replaceAll(path.sep,'/');
  let html=fs.readFileSync(file,'utf8');
  const initial=html;
  if(!html.includes('<body>')||!html.includes('</head>'))return false;
  const category=relative==='car/index.html'?'car':
    relative==='support/index.html'?'support':null;
  const article=/^(?:car|support)\/[^/]+\/(?:[23]\/)?index\.html$/.test(relative);
  const pageType=relative==='index.html'?'home':category?'category':article?'article':'utility';
  html=html.replace('<body>','<body class="life-modern life-modern-'+pageType+'">');
  if(pageType==='home')html=redesignHome(html);
  if(category)html=redesignCategory(html,category);
  html=html.replace('</head>',
    '<meta name="theme-color" content="#ffffff">'+
    '<link rel="stylesheet" href="/life-modern.css">'+
    '<script src="/life-modern.js" defer></script></head>');
  check((html.match(/<link rel="canonical"/g)||[]).length===1,
    'canonical altered on '+relative);
  check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
    'heading hierarchy error on '+relative);
  check((html.match(/href="\/life-modern\.css"/g)||[]).length===1,
    'modern stylesheet missing on '+relative);
  if(html!==initial)fs.writeFileSync(file,html);
  return true;
}
let processed=0;
for(const file of walk(DIST).filter(file=>file.endsWith('.html'))){
  if(decorate(file))processed++;
}
check(processed>=140,'expected generated LIFE HTML coverage, got '+processed);
console.log('[modern-ui] Redesigned '+processed+' pages, six visual subject cards, category filters, and content-first sponsor order. Editorial HTML and ad identifiers preserved.');
