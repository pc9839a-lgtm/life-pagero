import fs from 'node:fs';
import path from 'node:path';

// This pass runs after the compact homepage design. It adds one small dynamic
// information section while retaining six topics, ads, articles and SEO data.
const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const CREATED_AT='2026-11-05';
const read=p=>fs.readFileSync(path.join(DIST,p),'utf8');
const write=(p,content)=>{
  const file=path.join(DIST,p);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
};
const block=(name,content,footer='',mode='compact') =>
  '<section class="today-widget" data-mode="'+mode+'" data-today-'+name
  +' aria-label="'+(name==='weather'?'지역 날씨':name==='news'?'뉴스 헤드라인':name==='crypto'?'코인 시세':'코스피·코스닥')+'">'
  +content+'<p class="today-widget-meta" data-today-status role="status"></p>'
  +footer+'</section>';
const weather=mode=>block('weather',
  '<div class="today-widget-heading"><h3>날씨</h3>'
  +'<label><span class="sr-only">지역 선택</span><select data-weather-city>'
  +[['seoul','서울'],['incheon','인천'],['suwon','수원'],['busan','부산'],
    ['daegu','대구'],['daejeon','대전'],['gwangju','광주'],
    ['ulsan','울산'],['jeju','제주']]
    .map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')
  +'</select></label></div><div class="today-weather-body" data-weather-items>'
  +'<a class="today-official-link" href="https://www.weather.go.kr/" target="_blank" rel="noopener noreferrer">기상청 날씨 보기</a></div>','',mode);
const crypto=mode=>block('crypto',
  '<div class="today-widget-heading"><h3>코인</h3>'
  +'<a href="https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC" target="_blank" rel="noopener noreferrer">업비트 원문</a></div>'
  +'<div data-coin-items><a class="today-official-link" href="https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC" target="_blank" rel="noopener noreferrer">업비트 시세 보기</a></div>', '',mode);
const stocks=mode=>block('stocks',
  '<div class="today-widget-heading"><h3>증권</h3>'
  +'<a href="https://data.krx.co.kr/" target="_blank" rel="noopener noreferrer">KRX 공식 데이터</a></div>'
  +'<div data-stock-items><a class="today-official-link" href="https://data.krx.co.kr/" target="_blank" rel="noopener noreferrer">KRX 지수 보기</a></div>',
  '',mode);
const news=mode=>block('news',
  '<div class="today-widget-heading"><h3>주요뉴스</h3>'
  +(mode==='full'?'<label>분류 <select data-news-filter><option value="all">전체</option><option value="경제">경제</option></select></label>':'<a href="/today/">더 보기</a>')
  +'</div><p class="today-news-intro">기사 제목만 표시 · 클릭하면 언론사 원문 이동</p>'
  +'<div data-news-items><a class="today-official-link" href="https://www.yna.co.kr/" target="_blank" rel="noopener noreferrer">주요 뉴스 보기</a></div>','',mode);

let home=read('index.html');
const hero=home.match(/<section class="hero portal-home-hero">[\s\S]*?<\/section>/)?.[0];
if(!hero || !home.includes('class="portal-topic-card compact-topic"'))
  throw Error('Today dashboard: compact homepage layout changed');
// Keep the six-category + three-link homepage. Today's dynamic dashboard is
// available from the existing /today/ navigation, not forced above categories.
if(home.includes('class="today-glance"'))throw Error('Unexpected crowded homepage today panel');
write('index.html',home);

const template=read('finance/index.html');
const title='오늘의 날씨·주요뉴스·증권·코인 정보 | 생활비서';
const description='지역별 기상청 날씨 관측, 언론사 최신 뉴스 헤드라인, 코스피·코스닥 자료와 업비트 원화 코인 시세를 출처 및 기준시각과 함께 확인합니다.';
const fullBody='<div class="site-shell"><article class="portal-page finance-page today-page">'
  +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 오늘의 정보</nav>'
  +'<h1>오늘의 정보</h1>'
  +'<p class="today-page-intro">날씨, 주요뉴스, 증권, 코인 자료를 한곳에서 확인할 수 있습니다. '
  +'모든 데이터는 출처와 관측·발표·수집 시각을 구분해 표시합니다.</p>'
  +'<div class="today-full-grid">'+weather('full')+stocks('full')+crypto('full')+'</div>'
  +news('full')
  +'<section class="today-source-guidance"><h2>데이터는 어떻게 갱신되나요?</h2>'
  +'<p>날씨는 기상청 초단기실황(약 30분 캐시), 뉴스는 언론사가 공개한 RSS(약 10분 캐시), '
  +'코인은 업비트 원화마켓 공개 시세(약 3분 캐시)를 확인합니다. 브라우저를 열어 둔 동안에도 다시 조회합니다. '
  +'증권은 한국거래소 종가자료 이용권한이 확인된 경우에만 표시하며 장중 실시간 시세가 아닙니다.</p>'
  +'<p>뉴스는 제목·언론사·발행시각만 제공합니다. 본문과 상세 내용은 해당 언론사 원본에서 확인해야 합니다. '
  +'금융시장 자료는 투자 권유가 아니며 지연·변경될 수 있습니다.</p>'
  +'<div class="today-source-links">'
  +'<a href="https://www.weather.go.kr/" target="_blank" rel="noopener noreferrer">기상청</a>'
  +'<a href="https://www.yna.co.kr/" target="_blank" rel="noopener noreferrer">연합뉴스</a>'
  +'<a href="https://data.krx.co.kr/" target="_blank" rel="noopener noreferrer">한국거래소</a>'
  +'<a href="https://upbit.com/" target="_blank" rel="noopener noreferrer">업비트</a>'
  +'</div></section></article></div>';
let page=template;
const replacements=[
  [/<title>[\s\S]*?<\/title>/,'<title>'+title+'</title>'],
  [/<meta name="description"[^>]*>/,'<meta name="description" content="'+description+'">'],
  [/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+'/today/">'],
  [/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="'+title+'">'],
  [/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="'+description+'">'],
  [/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+'/today/">'],
  [/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+fullBody+'</main>']
];
for(const [regex,replacement] of replacements){
  if(!regex.test(page))throw Error('Today page template mismatch: '+regex);
  page=page.replace(regex,replacement);
}
const schema={'@context':'https://schema.org','@type':'CollectionPage',
  name:title,description,url:SITE+'/today/',inLanguage:'ko',
  isPartOf:{'@type':'WebSite',name:'생활비서',url:SITE+'/'},
  datePublished:CREATED_AT};
page=page.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
page=page.replace('</head>','<script type="application/ld+json">'+JSON.stringify(schema)+'</script>'
  +'<link rel="stylesheet" href="/today-dashboard.css">'
  +'<script defer src="/today-dashboard.js"></script></head>');
write('today/index.html',page);

// Securities page: public stock and crypto panels are complementary to
// existing source-linked company disclosures and monetary policy issues.
const marketsFile='finance/markets/index.html';
let markets=read(marketsFile);
const oldTitle='<h1>주식시장 주요 이슈·기업 공시</h1>';
if(!markets.includes(oldTitle))throw Error('Stock page title changed; preserve its editorial content');
markets=markets.replace(oldTitle,oldTitle+
  '<section class="today-market-inserts" aria-label="시장 지표·코인 현황">'
  +'<div class="today-two-grid">'+stocks('full')+crypto('full')+'</div></section>');
markets=markets.replace('</head>','<link rel="stylesheet" href="/today-dashboard.css">'
  +'<script defer src="/today-dashboard.js"></script></head>');
write(marketsFile,markets);

// Add a single visible "today" navigation destination to all generated pages.
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const full=path.join(dir,e.name);
  return e.isDirectory()?walk(full):[full];
});
for(const file of walk(DIST).filter(f=>f.endsWith('.html'))){
  let html=fs.readFileSync(file,'utf8');
  const anchor='<nav class="main-nav"><div class="nav-inner"><a href="/">홈</a>';
  if(html.includes(anchor)&&!html.includes('<a href="/today/">오늘의 정보</a>')){
    html=html.replace(anchor,anchor+'<a href="/today/">오늘의 정보</a>');
    fs.writeFileSync(file,html);
  }
}
const entries=JSON.parse(read('search-index.json'));
if(!entries.some(e=>e.url==='/today/'))entries.push({
  title:'오늘의 날씨·주요뉴스·증권·코인 정보',
  description:'기상청 날씨, 언론사 최신 헤드라인, 코스피·코스닥, 업비트 코인 원화시세',
  keywords:['오늘 날씨','오늘 주요뉴스','코스피 지수','코스닥 종가','비트코인 시세','코인 가격','증권','경제뉴스'],
  url:'/today/'
});
write('search-index.json',JSON.stringify(entries));
let sitemap=read('sitemap.xml');
if(!sitemap.includes('<loc>'+SITE+'/today/</loc>')){
  sitemap=sitemap.replace('</urlset>',
    '<url><loc>'+SITE+'/today/</loc><lastmod>'+CREATED_AT+'</lastmod></url></urlset>');
  write('sitemap.xml',sitemap);
}
for(const filename of ['index.html','today/index.html',marketsFile]){
  const html=read(filename);
  if((html.match(/<link rel="canonical"/g)||[]).length!==1 ||
    (html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)
    throw Error('Today SEO tag count invalid: '+filename);
}
console.log('[today] One compact homepage panel, one full information page, financial market embeds; SEO and ad markup preserved.');
