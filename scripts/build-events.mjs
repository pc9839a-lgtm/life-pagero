import fs from 'node:fs';
import path from 'node:path';
import {kstToday,periodDates,matches,sortEvents,REGION_LABELS,CATEGORY_LABELS,FEE_LABELS} from './events-core.mjs';

const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const snapshot=JSON.parse(fs.readFileSync('content/events.json','utf8'));
const events=Array.isArray(snapshot.events)?snapshot.events:[];
const read=f=>fs.readFileSync(path.join(DIST,f),'utf8');
const save=(f,html)=>{
  const filename=path.join(DIST,f);
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  fs.writeFileSync(filename,html);
};
const esc=(s='')=>String(s==null?'':s).replace(/[&<>"']/g,c=>({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
const fmt=s=>s?esc(s.replaceAll('-','.')):'일정 확인 필요';
const categories=CATEGORY_LABELS,regions=REGION_LABELS,fees=FEE_LABELS;
const opts=(dictionary)=>Object.entries(dictionary)
  .map(([key,label])=>'<option value="'+esc(key)+'">'+esc(label)+'</option>').join('');
function card(e) {
  return '<article class="events-card">'
    +'<div class="events-card-main"><div class="events-card-top"><span class="events-type">'
    +esc(categories[e.category]||'문화행사')+'</span><span class="events-fee">'
    +esc(fees[e.feeType]||'요금정보 없음')+'</span></div>'
    +'<h3><a href="/events/'+esc(e.slug)+'/">'+esc(e.title)+'</a></h3>'
    +'<p class="events-date">'+fmt(e.startDate)+' ~ '+fmt(e.endDate)+'</p>'
    +'<p class="events-place">'+esc(regions[e.region]||'지역 확인 필요')
    +(e.venue?' · '+esc(e.venue):'')+'</p></div>'
    +'<div class="events-card-actions"><a href="/events/'+esc(e.slug)+'/">행사 정보</a>'
    +'<button type="button" data-event-share="'+esc(e.slug)+'" data-title="'+esc(e.title)+'">공유</button></div>'
    +'</article>';
}
function renderPage(pathname,title,description,body,{schema=null,noindex=false}={}) {
  let html=read('finance/index.html');
  const replacements=[
    [/<title>[\s\S]*?<\/title>/,'<title>'+esc(title)+'</title>'],
    [/<meta name="description"[^>]*>/,'<meta name="description" content="'+esc(description)+'">'],
    [/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+pathname+'">'],
    [/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="'+esc(title)+'">'],
    [/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="'+esc(description)+'">'],
    [/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+pathname+'">'],
    [/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+body+'</main>']
  ];
  for(const [pattern,value] of replacements) {
    if(!pattern.test(html))throw Error('[events] Missing template marker: '+pattern);
    html=html.replace(pattern,value);
  }
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')
    .replace('<script defer src="/finance-live.js"></script>','');
  if(noindex){
    if(/<meta name="robots"[^>]*>/.test(html))
      html=html.replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex,follow">');
    else html=html.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
  }
  html=html.replace('</head>','<link rel="stylesheet" href="/events-ui.css">'
    +'<script defer src="/events-ui.js"></script>'
    +(schema?'<script type="application/ld+json">'+JSON.stringify(schema).replaceAll('<','\\u003c')+'</script>':'')
    +'</head>');
  if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)throw Error('[events] H1 count '+pathname);
  if((html.match(/<link rel="canonical"/g)||[]).length!==1)throw Error('[events] Canonical count '+pathname);
  save(pathname.slice(1)+'index.html',html);
}
const today=kstToday(),week=periodDates('this-week',today);
const visible=sortEvents(events.filter(e=>matches(e,{...week,region:'all',category:'all',fee:'all',q:''})),today).slice(0,20);
const intro='<div class="events-shell"><div class="events-intro">'
  +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 축제·행사</nav>'
  +'<h1>이번 주 축제·행사</h1><p>전국에서 확인된 축제·공연·전시를 찾아보세요.</p></div>';
const form='<div class="events-filters"><div class="events-periods" role="group" aria-label="행사 날짜">'
  +[['today','오늘'],['tomorrow','내일'],['weekend','이번 주말'],['this-week','이번 주'],['next-week','다음 주'],['custom','날짜 선택']]
    .map(([key,label])=>'<button type="button" data-period="'+key+'" aria-pressed="'+(key==='this-week'?'true':'false')+'">'+label+'</button>').join('')
  +'</div><div class="events-custom-dates" data-custom-dates hidden><label>시작일<input type="date" data-from></label>'
  +'<label>종료일<input type="date" data-to></label></div>'
  +'<div class="events-controls"><label>지역<select data-region>'+opts(regions)+'</select></label>'
  +'<label>종류<select data-category>'+opts(categories)+'</select></label>'
  +'<label>요금<select data-fee>'+opts(fees)+'</select></label></div>'
  +'<label class="events-search">행사 검색<input type="search" data-q maxlength="80" placeholder="행사명·장소 검색"></label>'
  +'<div class="events-toolbar"><p data-summary>이번 주 '+fmt(week.from)+' ~ '+fmt(week.to)+'</p>'
  +'<button type="button" data-share-list>검색 결과 공유</button></div></div>';
const empty='<div class="events-empty"><h2>아직 확인된 행사 데이터가 없습니다.</h2>'
  +'<p>공식 공공데이터 API 연동 후 목록이 자동 갱신됩니다. 임의로 행사 정보를 표시하지 않습니다.</p></div>';
const footer='<p class="events-notice">행사 일정과 요금은 변경될 수 있습니다. 방문 전 반드시 공식 주최 측 안내를 확인하세요. '
  +'공연 기간이 표시되어도 해당 기간에 매일 공연하는 것은 아닙니다.</p>'
  +'<div class="events-source">자료: 한국관광공사 TourAPI · KOPIS · 서울시 문화행사 정보'
  +(snapshot.generatedAt?' · 최근 수집 '+esc(snapshot.generatedAt.slice(0,10)):' · 데이터 연동 대기')
  +'</div></div>';
const body=intro+form+'<section class="events-results" aria-live="polite" aria-label="축제·행사 목록">'
  +'<div data-event-items class="events-grid">'+(visible.length?visible.map(card).join(''):empty)+'</div>'
  +'<button type="button" class="events-more" data-more hidden>20개 더 보기</button></section>'
  +footer;
renderPage('/events/','이번 주 전국 축제·공연·전시 | 생활비서',
  '이번 주 진행 중인 전국 축제, 콘서트, 공연, 전시와 체험 행사를 날짜·지역·요금별로 찾아보세요.',
  body,{noindex:events.length===0,schema:events.length?{
    '@context':'https://schema.org','@type':'CollectionPage',
    name:'이번 주 축제·행사',url:SITE+'/events/',inLanguage:'ko'
  }:null});
for(const event of events) {
  if (!event.startDate||!event.endDate)continue;
  const href='/events/'+event.slug+'/';
  const date=fmt(event.startDate)+' ~ '+fmt(event.endDate);
  const detail='<div class="events-shell events-detail"><nav class="portal-breadcrumbs" aria-label="현재 위치">'
    +'<a href="/">홈</a> / <a href="/events/">축제·행사</a> / 행사 상세</nav>'
    +'<a href="/events/" class="events-back">← 행사 목록</a>'
    +'<div class="events-detail-head"><span class="events-type">'+esc(categories[event.category]||'문화행사')+'</span>'
    +'<h1>'+esc(event.title)+'</h1></div>'
    +'<dl class="events-details"><div><dt>행사 기간</dt><dd>'+date+'</dd></div>'
    +'<div><dt>지역</dt><dd>'+esc(regions[event.region]||'확인 필요')+'</dd></div>'
    +'<div><dt>장소</dt><dd>'+esc(event.venue||'공식 안내에서 확인')+'</dd></div>'
    +'<div><dt>요금</dt><dd>'+esc(event.feeText||fees[event.feeType]||'정보 없음')+'</dd></div>'
    +(event.scheduleText?'<div><dt>일정 안내</dt><dd>'+esc(event.scheduleText)+'</dd></div>':'')
    +'<div><dt>정보 출처</dt><dd>'+esc(event.sourceLabel||event.source)+'</dd></div></dl>'
    +'<p class="events-notice">공연 기간은 매일 공연이 있다는 뜻이 아닙니다. 방문·예매 전 공식 일정과 요금을 확인하세요.</p>'
    +'<div class="events-detail-actions">'
    +(event.officialUrl?'<a href="'+esc(event.officialUrl)+'" target="_blank" rel="noopener noreferrer">공식 안내 확인</a>':'')
    +'<button type="button" data-copy-event="'+esc(event.title)+'">행사 링크 복사</button></div>'
    +'</div>';
  const schema={'@context':'https://schema.org','@type':'Event',
    name:event.title,startDate:event.startDate,endDate:event.endDate,
    eventStatus:'https://schema.org/EventScheduled',
    url:SITE+href,
    ...(event.venue?{location:{'@type':'Place',name:event.venue,
      ...(event.address?{address:event.address}:{})}}:{})};
  let pageTitle=event.title+' | '+date+' | 생활비서';
  let description=event.title+' · '+date+' · '+(regions[event.region]||'전국')+
    (event.venue?' · '+event.venue:'')+'. 일정과 요금은 주최 측에 확인하세요.';
  renderPage(href,pageTitle,description,detail,{schema});
}
save('events-data.json',JSON.stringify(snapshot));
let sitemap=read('sitemap.xml');
const urls=events.length?['/events/',...events.map(e=>'/events/'+e.slug+'/')]:[];
const lastmod=snapshot.generatedAt?.slice(0,10)||today;
for(const p of urls){
  const loc='<loc>'+SITE+p+'</loc>';
  if(!sitemap.includes(loc))sitemap=sitemap.replace('</urlset>',
    '<url>'+loc+'<lastmod>'+lastmod+'</lastmod></url></urlset>');
}
save('sitemap.xml',sitemap);
const index=JSON.parse(read('search-index.json'));
if(events.length && !index.some(e=>e.url==='/events/'))index.push({
  url:'/events/',title:'이번 주 축제·행사',description:'전국 공연·축제·전시 일정 및 지역 필터',
  keywords:['이번 주 축제','주말 공연','전국 행사','무료 전시','콘서트']
});
save('search-index.json',JSON.stringify(index));
// Avoid changing the shared six-item global nav and associated regression tests.
let home=read('index.html');
if(!home.includes('href="/events/"')) {
  const block='<section class="events-home-banner" aria-label="이번 주 축제·행사">'
    +'<div><strong>이번 주 축제·행사</strong><p>전국 공연·축제·전시를 날짜와 지역별로 찾아보세요.</p></div>'
    +'<a href="/events/">행사 찾아보기</a></section>';
  const marker='<main id="main-content">';
  if(!home.includes(marker))throw Error('[events] Home main missing');
  home=home.replace(marker,marker+block);
  home=home.replace('</head>','<link rel="stylesheet" href="/events-ui.css"></head>');
  save('index.html',home);
}
console.log('[events] '+events.length+' verified event details, listing/filter UI, home entry and SEO generated.');
