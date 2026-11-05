import fs from 'node:fs';
import path from 'node:path';

/* Final presentation-only pass. No source post, ad identifier, destination or canonical is rewritten.
   Put no more than six categories and three links in the initial home information area. */
const DIST=path.resolve('dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const next=path.join(dir,entry.name);
  return entry.isDirectory()?walk(next):[next];
});
const requireTrue=(condition,message)=>{if(!condition)throw Error('[compact-ui] '+message)};
const read=file=>fs.readFileSync(path.join(DIST,file),'utf8');
const write=(file,html)=>fs.writeFileSync(path.join(DIST,file),html);
const text=(raw='')=>String(raw).replace(/<[^>]*>/g,'').trim();
const esc=(str='')=>String(str).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function compactHome(html){
  const hero=html.match(/<section class="hero portal-home-hero">[\s\S]*?<\/section>/)?.[0];
  requireTrue(hero,'home hero not found');
  let light=hero.replace(/<span class="modern-eyebrow">[\s\S]*?<\/span>/,'')
    .replace(/<h1>[\s\S]*?<\/h1>/,'<h1>무엇을 찾고 계신가요?</h1>')
    .replace(/<p>[\s\S]*?<\/p>/,'')
    .replace(/<div class="portal-search-suggestions">[\s\S]*?<\/div>/,'')
    .replace(/placeholder="[^"]*"/,'placeholder="지원금, 자동차, 세금 검색"');
  requireTrue(light.includes('portal-home-q')&&light.includes('role="search"'),'native home search removed');
  html=html.replace(hero,light);

  // Only one obvious destination per visual tile; no description or article list on a card.
  let subjects=0;
  html=html.replace(/<section class="portal-topic-card" aria-label="([^"]+)">([\s\S]*?)<\/section>/g,(_all,label,inner)=>{
    const a=inner.match(/<h3><a href="([^"]+)">([\s\S]*?)<\/a><\/h3>/);
    const ico=inner.match(/<span class="modern-topic-icon"[\s\S]*?<\/span>/)?.[0];
    requireTrue(a&&ico,'subject tile requires its original correct link: '+label);
    subjects++;
    return '<section class="portal-topic-card compact-topic" aria-label="'+esc(label)+'">'+
      '<a href="'+a[1]+'" class="compact-topic-link">'+ico+'<strong>'+a[2]+'</strong></a></section>';
  });
  requireTrue(subjects===6,'expected six icon-only topics, got '+subjects);
  html=html.replace(/(<h2 id="portal-topic-title">)[\s\S]*?(<\/h2>)/,'$1분야별 찾기$2');
  html=html.replace(/(<div class="portal-section-heading"><h2 id="portal-topic-title">[\s\S]*?<\/h2>)<p>[\s\S]*?<\/p>/,'$1');

  // Finance had introduced another dense 2-card panel above the subjects.
  // Retain both important links in the expandable area below.
  const finance=html.match(/<section class="finance-home-shortcuts"[\s\S]*?<\/section>/)?.[0];
  requireTrue(finance,'finance shortcuts source section not found');
  html=html.replace(finance,'');

  const popular='<section class="compact-popular" aria-labelledby="compact-popular-title">'+
    '<div class="compact-popular-top"><h2 id="compact-popular-title">많이 찾는 정보</h2>'+
    '<a href="/search/">전체 검색 <span aria-hidden="true">›</span></a></div>'+
    '<ul><li><a href="/support/basic-pension-2026/">기초연금 대상 확인 <span aria-hidden="true">›</span></a></li>'+
    '<li><a href="/car/car-inspection-period/">자동차 검사기간 조회 <span aria-hidden="true">›</span></a></li>'+
    '<li><a href="/support/housing-benefit-2026/">주거급여 신청 조건 <span aria-hidden="true">›</span></a></li></ul></section>';
  const pathAnchor='<section class="section life-pathways"';
  requireTrue(html.includes(pathAnchor),'situation-guide section missing');
  html=html.replace(pathAnchor,popular+pathAnchor);

  // The old 4 large tasks, latest post cards and finance shortcut lists
  // remain in the HTML but are not forced on every visitor at first glance.
  const situation=html.match(/<section class="section life-pathways"[\s\S]*?<\/section>/)?.[0];
  requireTrue(situation,'no task section to disclose');
  html=html.replace(situation,'<details class="compact-explore"><summary>상황별로 찾아보기</summary>'+situation+'</details>');

  const latest=html.match(/<section class="section"><div class="section-header">[\s\S]*?<h2>최신 글<\/h2>[\s\S]*?<\/section>/)?.[0];
  requireTrue(latest,'latest article section missing');
  html=html.replace(latest,'<details class="compact-explore compact-latest"><summary>최근 등록된 글 보기</summary>'+latest+'</details>');

  const archive='<details class="modern-all-articles">';
  requireTrue(html.includes(archive),'full article archive missing');
  html=html.replace('<summary>전체 글 목록 펼쳐보기</summary>','<summary>전체 글 목록</summary>');
  const anchor='<details class="modern-all-articles">';
  html=html.replace(anchor,
    '<details class="compact-explore compact-tools"><summary>금융 도구 더보기</summary>'+
    '<nav aria-label="금융 서비스 바로가기" class="compact-tool-links">'+
    '<a href="/finance/savings/">예·적금 금리</a>'+
    '<a href="/finance/markets/">주식·경제 이슈</a>'+
    '<a href="/finance/loan-payment/">대출 계산기</a></nav></details>'+
    anchor);
  requireTrue(html.includes('href="/finance/savings/"')&&html.includes('href="/finance/markets/"'),
    'finance features must remain discoverable');
  return html;
}
function compactCategory(html,category){
  const source=html.match(/<div class="portal-category-quick">[\s\S]*?<\/div>/)?.[0];
  requireTrue(source,'category shortcuts not found: '+category);
  html=html.replace(source,'<details class="compact-explore compact-category-links"><summary>자주 찾는 정보</summary>'+source+'</details>');
  return html;
}
function compactArticle(html,file){
  // The 3 existing key facts remain in source; show only the first sentence on load.
  const brief=html.match(/<section class="portal-article-brief"[\s\S]*?<\/section>/)?.[0];
  requireTrue(brief,'answer-first source missing: '+file);
  const facts=[...brief.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m=>m[1]);
  requireTrue(facts.length>=2,'cannot safely preserve original key facts: '+file);
  const official=brief.match(/<a class="portal-brief-official"[\s\S]*?<\/a>/)?.[0]||'';
  const summary='<section class="compact-answer" aria-label="핵심 정보">'+
    '<span class="compact-answer-label">핵심 내용</span>'+
    '<p class="compact-answer-primary">'+facts[0]+'</p>'+
    '<div class="compact-answer-actions">'+
    '<a href="#compact-full-guide" data-compact-open="true" class="compact-read">전체 설명 읽기 <span aria-hidden="true">›</span></a>'+
    (official?official.replace('portal-brief-official','compact-official'):'')+'</div>'+
    '<details class="compact-more-answers"><summary>핵심 정보 더보기</summary>'+
    '<ul>'+facts.slice(1).map(f=>'<li>'+f+'</li>').join('')+'</ul></details></section>';
  html=html.replace(brief,summary);
  const target='<div class="article-content">';
  requireTrue(html.includes(target),'article content missing: '+file);
  const opener='<details id="compact-full-guide" class="compact-full-guide">'+
    '<summary>상세 내용 펼쳐보기 <span aria-hidden="true">⌄</span></summary>';
  html=html.replace(target,opener+target);
  const end='</div></article><aside class="sidebar">';
  requireTrue(html.includes(end),'article content closing wrapper missing: '+file);
  html=html.replace(end,'</div></details></article><aside class="sidebar">');
  return html;
}
let count=0,articles=0;
for(const absolute of walk(DIST).filter(f=>f.endsWith('.html'))){
  const file=path.relative(DIST,absolute).replaceAll(path.sep,'/');
  let html=read(file);
  if(!html.includes('class="life-modern '))continue;
  if(file==='index.html')html=compactHome(html);
  if(file==='car/index.html'||file==='support/index.html')
    html=compactCategory(html,file.split('/')[0]);
  if(/^(?:car|support)\/[^/]+\/index\.html$/.test(file)){
    html=compactArticle(html,file);articles++;
  }
  html=html.replace('</head>',
    '<link rel="stylesheet" href="/life-compact.css">'+
    '<script defer src="/life-compact.js"></script></head>');
  requireTrue((html.match(/<link rel="canonical"/g)||[]).length===1,'canonical damaged: '+file);
  write(file,html);count++;
}
requireTrue(articles===46,'must retain all 46 article summaries: '+articles);
requireTrue(count>=140,'expected 140+ rendered pages: '+count);
console.log('[compact-ui] '+count+' pages, six one-tap topics, three popular links, expandable extras, 46 first-answer article summaries.');
