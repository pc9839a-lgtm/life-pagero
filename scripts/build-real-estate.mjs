import fs from 'node:fs';
import path from 'node:path';

// This first release is deliberately a clearly labelled DEMO, not a real offer.
// Never publish an unverified listing as real, nor index a fictitious advert.
const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const {listings}=JSON.parse(fs.readFileSync('content/real-estate.json','utf8'));
if(!Array.isArray(listings)||listings.length!==1||listings[0].sample!==true||
   listings[0].approved!==false)throw Error('[real-estate] Expected a single unapproved sample');
const sample=listings[0];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const read=name=>fs.readFileSync(path.join(DIST,name),'utf8');
const save=(name,html)=>{
  const target=path.join(DIST,name);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,html);
};
const visual='<div class="re-visual">'
  +'<svg role="img" aria-label="실제 분양현장과 무관한 건축물 일러스트" viewBox="0 0 400 310" preserveAspectRatio="xMidYMid slice">'
  +'<rect width="400" height="310" fill="#e2e9ec"/>'
  +'<path d="M0 265 85 244 250 259 400 236v74H0Z" fill="#c3ced0"/>'
  +'<path d="M28 269V88l96-40 62 31v190Z" fill="#f2f4f2"/>'
  +'<path d="M47 269V79l73-28 47 28v190Z" fill="#adbfc6"/>'
  +'<path d="M61 269V94l57-21 35 19v177Z" fill="#f7f7f4"/>'
  +'<path d="M177 269V28l127 29v212Z" fill="#c0cdd1"/>'
  +'<path d="M195 269V52l92 20v197Z" fill="#f3f4f1"/>'
  +'<path d="M307 269V117l73-24v176Z" fill="#b8c6cb"/>'
  +'<g fill="#a1b5bd">'
  +'<path d="M70 105h23v26H70zm34 0h23v26h-23zm-34 40h23v26H70zm34 0h23v26h-23zm-34 40h23v26H70zm34 0h23v26h-23zm-34 40h23v26H70zm34 0h23v26h-23z"/>'
  +'<path d="M207 78h28v29h-28zm41 0h28v29h-28zm-41 43h28v29h-28zm41 0h28v29h-28zm-41 43h28v29h-28zm41 0h28v29h-28zm-41 43h28v29h-28zm41 0h28v29h-28z"/>'
  +'</g><path d="M0 286Q195 258 400 291V310H0Z" fill="#d1d9d3"/>'
  +'</svg><span class="re-watermark">시안 · 실제 분양 현장 아님</span></div>';
const advert='<aside class="re-side" aria-label="무료 분양정보 사이드 광고">'
  +'<div class="re-side-heading"><strong>분양정보 · 사이드 광고</strong><span>무료 게재 샘플</span></div>'
  +'<a class="re-banner" href="/real-estate/sample/" aria-label="가상 분양 현장 상세 샘플 보기">'
  +visual+'<div class="re-banner-copy"><small>인천 · 신규 분양 예시</small>'
  +'<h3>'+esc(sample.title)+'</h3><p>지역·가격·일정은 검증 후 게재합니다.</p>'
  +'<strong>분양정보 보기 →</strong></div></a>'
  +'<p class="re-disclosure">광고 · 실제 현장과 무관한 디자인 샘플입니다.</p></aside>';
const info='<div class="re-process"><h2>무료 분양정보 등록 절차</h2>'
  +'<p>현장 담당자가 광고자료를 제공하면 운영자가 확인 후 노출합니다. 현재는 샘플이며 접수 기능이 별도로 연결되지 않았습니다.</p>'
  +'<div class="re-steps"><div class="re-step"><strong>01　자료 접수</strong><span>현장명·지역·유형·모집공고·광고 이미지·담당자</span></div>'
  +'<div class="re-step"><strong>02　운영자 확인</strong><span>광고 권한·실제 일정·공식 자료·이미지 사용 권한 확인</span></div>'
  +'<div class="re-step"><strong>03　무료 게재</strong><span>분양 목록·상세·사이드 광고 순서로 게시</span></div></div></div>';
const filters='<div class="re-filters" aria-label="분양정보 필터">'
  +'<button type="button" data-re-type="all" aria-pressed="true">전체</button>'
  +'<button type="button" data-re-type="아파트" aria-pressed="false">아파트</button>'
  +'<button type="button" data-re-type="오피스텔" aria-pressed="false">오피스텔</button>'
  +'<button type="button" data-re-type="상가" aria-pressed="false">상가</button>'
  +'<select id="re-region" aria-label="지역"><option value="all">전체 지역</option>'
  +'<option value="인천">인천</option><option value="서울">서울</option>'
  +'<option value="경기">경기</option><option value="기타">기타 지역</option></select></div>';
const listing='<article class="re-listing" data-re-listing data-re-type="'
  +esc(sample.category)+'" data-re-region="'+esc(sample.region)+'">'
  +visual+'<div class="re-copy"><span class="re-chip">가상 샘플 · '+esc(sample.category)+'</span>'
  +'<h3>'+esc(sample.title)+'</h3><p>'+esc(sample.description)+'</p>'
  +'<div class="re-facts"><span>위치: '+esc(sample.region)+'(예시)</span>'
  +'<span>청약: 미확인</span><span>분양가: 미확인</span></div>'
  +'<a class="re-more" href="/real-estate/sample/">샘플 상세페이지 보기 →</a></div></article>';
const filterScript='<script>(function(){'
  +'const listing=document.querySelector("[data-re-listing]");'
  +'const region=document.getElementById("re-region");'
  +'const empty=document.getElementById("re-empty");'
  +'let type="all";'
  +'function update(){const match=(type==="all"||type===listing.dataset.reType)'
  +'&&(region.value==="all"||region.value===listing.dataset.reRegion);'
  +'listing.hidden=!match;empty.hidden=match;}'
  +'document.querySelectorAll("[data-re-type]").forEach(btn=>btn.addEventListener("click",()=>{'
  +'type=btn.dataset.reType;document.querySelectorAll("[data-re-type]").forEach(x=>'
  +'x.setAttribute("aria-pressed",String(x===btn)));update();}));'
  +'region.addEventListener("change",update);update();})();</script>';
const crumb='<div class="re-breadcrumb"><a href="/">홈</a>　/　<a href="/real-estate/">분양정보</a></div>';
const heading='<header class="re-header"><div class="re-header-row"><div>'
  +'<span class="re-kicker">REAL ESTATE</span><h1>전국 분양정보</h1>'
  +'<p>아파트·오피스텔·상가 등 분양 현장 정보를 운영자가 확인해 등록합니다.</p>'
  +'</div><a class="re-action" href="/contact/">무료 광고 등록 문의 →</a></div></header>';
const listMain='<div class="re-shell">'+crumb+heading
  +'<div class="re-columns"><div class="re-main">'
  +'<div class="re-titlebar"><h2>분양 현장</h2><small>시안 1건</small></div>'
  +filters+listing
  +'<div id="re-empty" class="re-empty" hidden>선택하신 조건에 등록된 분양정보가 없습니다.</div>'
  +'<p class="re-smallprint">※ 위 내용은 가상 시안으로 실제 공급 현장·모집공고·분양가격이 아닙니다.</p>'
  +info+'</div>'+advert+'</div></div>'+filterScript;
const detail='<div class="re-shell">'+crumb
  +'<header class="re-header"><span class="re-kicker">분양정보 상세 · 시안</span>'
  +'<h1>'+esc(sample.title)+'</h1><p>실제 분양 현장으로 오인하지 않도록 만든 가상 상세페이지입니다.</p></header>'
  +'<div class="re-columns"><div class="re-main">'
  +'<div class="re-detail"><dl>'
  +'<dt>건물 유형</dt><dd>'+esc(sample.category)+' (예시)</dd>'
  +'<dt>위치</dt><dd>'+esc(sample.address)+'</dd>'
  +'<dt>공급 규모·면적</dt><dd>'+esc(sample.supply)+'</dd>'
  +'<dt>분양가</dt><dd>'+esc(sample.price)+'</dd>'
  +'<dt>분양 일정</dt><dd>'+esc(sample.schedule)+'</dd>'
  +'<dt>사업주체·공식 출처</dt><dd>자료 검증 후 게시</dd>'
  +'<dt>분양 상담</dt><dd>담당자 확인 후 게시</dd>'
  +'</dl></div><p class="re-warning">디자인 샘플입니다. 실제 분양정보가 아니며 상담이나 신청을 받지 않습니다.</p>'
  +'<a href="/real-estate/" class="re-more">← 분양정보 목록으로</a>'
  +info+'</div>'+advert+'</div></div>';
function render(pathname,title,description,body){
  // Reuse the verified site shell instead of introducing another app/router.
  let html=read('about/index.html');
  const replacements=[
    [/<title>[\s\S]*?<\/title>/,'<title>'+esc(title)+'</title>'],
    [/<meta name="description"[^>]*>/,'<meta name="description" content="'+esc(description)+'">'],
    [/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+pathname+'">'],
    [/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="'+esc(title)+'">'],
    [/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="'+esc(description)+'">'],
    [/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+pathname+'">'],
    [/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+body+'</main>']
  ];
  for(const [pattern,replacement] of replacements){
    if(!pattern.test(html))throw Error('[real-estate] Missing template marker '+pattern);
    html=html.replace(pattern,replacement);
  }
  if(/<meta name="robots"[^>]*>/.test(html)){
    html=html.replace(/<meta name="robots"[^>]*>/,
      '<meta name="robots" content="noindex,follow">');
  }else{
    html=html.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
  }
  // The prototype must not accidentally inherit article structured data.
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
  html=html.replace('</head>','<link rel="stylesheet" href="/real-estate.css"></head>');
  if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)throw Error('[real-estate] H1 count');
  if((html.match(/<link rel="canonical"/g)||[]).length!==1)throw Error('[real-estate] Canonical count');
  save(pathname.slice(1)+'index.html',html);
}
render('/real-estate/','분양정보 · 무료 광고 샘플 | 생활비서',
  '아파트·오피스텔·상가 분양정보 무료 게재 메뉴의 디자인 샘플입니다. 실제 청약 정보가 아닙니다.',listMain);
render('/real-estate/sample/','가상 분양 현장 A · 사이드 광고 시안 | 생활비서',
  '실제 분양 현장과 무관한 생활비서 무료 분양 광고 상세페이지 샘플입니다.',detail);
console.log('[real-estate] Built one clearly labelled noindex sample, list and detail pages.');
