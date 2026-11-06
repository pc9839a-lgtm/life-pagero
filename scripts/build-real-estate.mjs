import fs from 'node:fs';
import path from 'node:path';

// Only the real-estate content section is new. The shared LIFE header,
// navigation, article templates, and existing ad placements remain unchanged.
// Everything shown is fictional and non-indexable until verified offers exist.
const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const listings=JSON.parse(fs.readFileSync('content/real-estate.json','utf8')).listings;
if(!Array.isArray(listings)||listings.length!==3||listings.some(x=>x.sample!==true||x.approved!==false)) {
  throw Error('[real-estate] Only three unapproved demonstration listings are permitted');
}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=(name,html)=>{const f=path.join(DIST,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,html)};
// Licensed stock architecture photos are used only for clearly marked fictional demos.
const photos={
  dongtan:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=720&q=80',
  siheung:'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=720&q=80',
  suwon:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=720&q=80',
  main:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=85',
  sub1:'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
  sub2:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80'
};
function visual(key,alt) {
  if(!photos[key])throw Error('[real-estate] Missing photograph '+key);
  return '<img class="re-image" src="'+photos[key]+'" alt="'+esc(alt)+'" loading="lazy" decoding="async">';
}
const pin='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const building='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V5l7-3 7 3v16M1 21h22M8 8h3M8 12h3M8 16h3"/></svg>';
const calendar='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 2v6M17 2v6M3 10h18"/></svg>';
const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg>';
function listingCard(item){
 const target='/real-estate/'+esc(item.slug)+'/';
 return '<article class="re-card'+(item.featured?' re-featured':'')+'" data-re-card data-type="'+esc(item.type)+'" data-region="'+esc(item.region)+'" data-status="'+esc(item.status)+'" data-search="'+esc([item.title,item.address,item.category,item.description].join(' '))+'">'
  +'<a class="re-photo" href="'+target+'">'+visual(item.graphic,'실제 현장과 무관한 '+item.title+' 가상 건축 이미지')+(item.featured?'<span class="re-recommend">♛ 추천</span>':'')+'</a>'
  +'<div class="re-card-body"><div class="re-tags"><span class="re-tag re-type">'+esc(item.category)+'</span><span class="re-tag '+(item.status==='ongoing'?'re-ongoing':'re-upcoming')+'">'+esc(item.statusLabel)+'</span><span class="re-tag re-fiction">가상</span></div>'
  +'<h2><a href="'+target+'">'+esc(item.title)+'</a></h2>'
  +'<p class="re-description">'+esc(item.description)+'</p><div class="re-facts">'
  +'<span>'+pin+esc(item.address)+'</span>'
  +'<span>'+building+'규모·면적: '+esc(item.supply)+'</span>'
  +'<span>'+calendar+'일정: '+esc(item.schedule)+'</span></div>'
  +'<a class="re-more" href="'+target+'">상세보기 ›</a></div></article>';
}
const tabOptions=[['all','전체'],['apartment','아파트'],['officetel','오피스텔'],['commercial','상가'],['knowledge','지식산업센터']];
const counts={all:listings.length};
for(const x of listings)counts[x.type]=(counts[x.type]||0)+1;
const tabs='<div class="re-tabs" role="group" aria-label="분양 종류">'
  +tabOptions.map(([id,label])=>'<button type="button" class="re-tab" data-re-tab="'+id+'" aria-pressed="'+(id==='all')+'">'+label+' <span>('+ (counts[id]||0)+')</span></button>').join('')+'</div>';
const selectors='<form class="re-filter-panel" id="re-search-form" role="search">'
  +'<div class="re-filter-row"><label class="re-select">'+pin+'<select id="re-region" aria-label="지역"><option value="all">지역 전체</option>'
  +['서울','경기','인천','부산','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'].map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</select><b>⌄</b></label>'
  +'<label class="re-select">'+building+'<select id="re-type" aria-label="건축물 유형"><option value="all">유형 전체</option>'
  +tabOptions.slice(1).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+'</select><b>⌄</b></label>'
  +'<label class="re-select">'+calendar+'<select id="re-status" aria-label="분양 상태"><option value="all">분양상태 전체</option><option value="ongoing">분양중</option><option value="upcoming">분양예정</option></select><b>⌄</b></label></div>'
  +'<div class="re-search-row">'+searchIcon+'<input id="re-query" type="search" aria-label="분양 현장 검색" placeholder="단지명, 지역, 시공사 검색" maxlength="80"><button type="submit">검색</button></div>'
  +'</form>';
const adRail='<aside class="re-ad-rail" aria-label="분양정보 광고">'
  +'<a class="re-ad re-ad-main" href="/real-estate/sample/" aria-label="가상 광고: 화성 동탄 프라임시티 상세페이지">'
  +'<div class="re-ad-art-main">'+visual('main','실제 분양 현장이 아닌 일반 고층 건물 참고 사진')+'<div class="re-banner-content">'
  +'<div class="re-banner-kicker">동탄2신도시 핵심입지</div><h2>화성 동탄<br><em>프라임시티</em></h2>'
  +'<p class="re-banner-supply">총 1,254세대 · 전용 59~114㎡ <small>(가상)</small></p>'
  +'<div class="re-banner-fill"></div>'
  +'<div class="re-banner-benefits"><span>GTX-A<br>(예정)</span><span>대형<br>쇼핑시설</span><span>우수한<br>교육환경</span><span>쾌적한<br>공원환경</span></div>'
  +'<div class="re-banner-cta"><strong>3월 분양(예시) │ 관심고객 등록중!</strong><b>분양정보 확인하기 ›</b></div>'
  +'</div></div><span class="re-ad-label">광고</span><span class="re-ad-fiction">가상 광고</span></a>'
  +'<a class="re-ad re-ad-sub" href="/real-estate/sample-siheung/" aria-label="가상 광고: 시흥 배곧 더리버뷰 상세페이지">'
  +'<div class="re-sub-content">'+visual('sub1','실제 현장이 아닌 건축물 참고 사진')+'<div><strong>시흥 배곧 더리버뷰</strong><p>바다와 공원이 만나는 프리미엄</p><span>자세히 보기 ›</span></div></div><span class="re-ad-fiction">가상 광고</span></a>'
  +'<a class="re-ad re-ad-sub" href="/real-estate/sample-suwon/" aria-label="가상 광고: 수원 광교 아울렛몰 상가 상세페이지">'
  +'<div class="re-sub-content re-sub-violet">'+visual('sub2','실제 현장이 아닌 건축물 참고 사진')+'<div><strong>광교 아울렛몰 상가</strong><p>안정적 수익! 프리미엄 상권!</p><span>분양문의 ›</span></div></div><span class="re-ad-fiction">가상 광고</span></a>'
  +'<p class="re-ad-legal">모든 분양 홍보물은 디자인용 가상 광고이며 실제 분양·상담이 아닙니다.</p></aside>';
const crumb='<nav class="re-breadcrumb" aria-label="현재 위치"><a href="/">⌂　홈</a><span>›</span><span>부동산</span><span>›</span><strong>분양정보</strong></nav>';
const heading='<header class="re-heading"><div class="re-h1">'+building+'<h1>부동산 분양정보</h1></div><p>전국 아파트, 오피스텔, 상가 등 분양 소식을 한눈에 확인하세요.</p></header>';
const intro=crumb+heading+tabs+selectors
  +'<p class="re-notice">화면 구성 확인용 가상 분양정보 3건입니다. 실제 현장·공급 규모·청약 일정이 아닙니다.</p>';
const js='<script>(function(){'
  +'const cards=[...document.querySelectorAll("[data-re-card]")];if(!cards.length)return;'
  +'const region=document.getElementById("re-region"),type=document.getElementById("re-type"),status=document.getElementById("re-status"),query=document.getElementById("re-query"),empty=document.getElementById("re-empty");'
  +'let tab="all";function render(){const q=query.value.trim().toLocaleLowerCase("ko-KR");let n=0;'
  +'for(const c of cards){const visible=(tab==="all"||c.dataset.type===tab)&&(type.value==="all"||c.dataset.type===type.value)'
  +'&&(region.value==="all"||c.dataset.region===region.value)&&(status.value==="all"||c.dataset.status===status.value)'
  +'&&(!q||c.dataset.search.toLocaleLowerCase("ko-KR").includes(q));c.hidden=!visible;if(visible)n++;}'
  +'empty.hidden=n!==0;}'
  +'document.querySelectorAll("[data-re-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.reTab;'
  +'document.querySelectorAll("[data-re-tab]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));type.value="all";render();}));'
  +'[region,type,status].forEach(el=>el.addEventListener("change",()=>{if(el===type){tab="all";document.querySelectorAll("[data-re-tab]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.reTab==="all")));}render();}));'
  +'document.getElementById("re-search-form").addEventListener("submit",e=>{e.preventDefault();render();});'
  +'query.addEventListener("input",render);render();})();</script>';
const listMain='<div class="re-shell"><div class="re-layout"><section class="re-left" aria-label="분양정보 목록">'+intro
  +'<div class="re-results">'+listings.map(listingCard).join('')+'</div>'
  +'<p class="re-empty" id="re-empty" role="status" hidden>선택하신 조건에 등록된 분양정보가 없습니다.</p>'
  +'<div class="re-registration"><strong>분양정보 무료 등록 안내</strong><p>실제 광고주 등록은 담당자·광고 권한·모집공고 확인 후 게시합니다. 이 샘플에서는 신청 데이터를 수집하지 않습니다.</p></div>'
  +'</section>'+adRail+'</div></div>'+js;
function detailPage(item) {
 const body='<div class="re-shell"><div class="re-layout"><section class="re-left">'+crumb
   +'<header class="re-heading"><div class="re-h1">'+building+'<h1>'+esc(item.title)+'</h1></div><p>실제 분양 현장이 아닌 상세페이지 디자인 샘플입니다.</p></header>'
   +'<div class="re-detail-pic">'+visual(item.graphic, item.title+' 가상 건축 이미지')+'</div>'
   +'<dl class="re-details"><dt>현장명</dt><dd>'+esc(item.title)+' (가상)</dd><dt>건물 유형</dt><dd>'+esc(item.category)+'</dd><dt>위치</dt><dd>'+esc(item.address)+'</dd><dt>공급 규모·면적</dt><dd>'+esc(item.supply)+'</dd><dt>분양 일정</dt><dd>'+esc(item.schedule)+'</dd><dt>분양가</dt><dd>'+esc(item.price)+'</dd><dt>사업주체·모집공고</dt><dd>실제 자료 미확인</dd></dl>'
   +'<p class="re-notice">실제 현장·분양조건·청약일정이 아닙니다. 광고 게재 전 공식 자료 확인이 필요합니다.</p>'
   +'<a class="re-back" href="/real-estate/">← 분양정보 목록</a></section>'+adRail+'</div></div>';
 return body;
}
function render(pathname,title,description,body){
 let html=fs.readFileSync(path.join(DIST,'about/index.html'),'utf8');
 const replacements=[
  [/<title>[\s\S]*?<\/title>/,'<title>'+esc(title)+'</title>'],
  [/<meta name="description"[^>]*>/,'<meta name="description" content="'+esc(description)+'">'],
  [/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+pathname+'">'],
  [/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="'+esc(title)+'">'],
  [/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="'+esc(description)+'">'],
  [/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+pathname+'">'],
  [/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+body+'</main>']
 ];
 for(const [regex,value] of replacements){if(!regex.test(html))throw Error('[real-estate] Missing template '+regex);html=html.replace(regex,value);}
 html=html.replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex,follow">');
 html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
 html=html.replace('</head>','<link rel="stylesheet" href="/real-estate.css"></head>');
 if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)throw Error('[real-estate] Multiple main headlines on '+pathname);
 save(pathname.slice(1)+'index.html',html);
}
render('/real-estate/','부동산 분양정보 | 생활비서','부동산 분양정보 배치 확인용 가상 샘플 3건입니다.',listMain);
for(const item of listings)render('/real-estate/'+item.slug+'/','분양정보 시안 · '+item.title+' | 생활비서',item.title+' 가상 광고 상세 샘플.',detailPage(item));
console.log('[real-estate] Built approved 3-listing content area + 3-ad sidebar; all samples noindex.');
