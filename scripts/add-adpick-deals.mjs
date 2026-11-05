import fs from "node:fs";import path from "node:path";
// Static SEO-neutral shell. Live ADPICK for BIZ products are NOT persisted in dist.
const DIST=path.resolve("dist"),SITE="https://pagero.kr/life";
const read=p=>fs.readFileSync(path.join(DIST,p),"utf8");
const write=(p,body)=>{const file=path.join(DIST,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
const replace=(s,re,v,label)=>{if(!re.test(s))throw Error("ADPICK BIZ template missing: "+label);return s.replace(re,v);};
const content=`<div class="site-shell"><article class="adpick-deals">
<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 핫딜</nav>
<h1>오늘의 핫딜</h1>
<p class="adpick-intro">지금 인기 있는 상품을 살펴보고 원하는 상품을 검색해 보세요.</p>
<p class="adpick-disclosure">이 페이지는 제휴 활동으로 수수료를 제공받을 수 있습니다.</p>
<div class="adpick-section-head"><h2>상품 모아보기</h2></div>
<div class="adpick-filters" data-deals-filters role="group" aria-label="추천상품 종류"></div>
<form class="adpick-toolbar adpick-search" data-deals-search role="search"><label for="adpick-query">상품 검색</label>
<input type="search" name="q" id="adpick-query" minlength="2" maxlength="40" placeholder="상품 이름 입력" required>
<button type="submit">검색</button></form>
<p class="adpick-meta" data-deals-status role="status">상품을 확인하고 있습니다.</p>
<div class="adpick-grid" data-deals-list aria-live="polite"></div>

</article></div>`;
let html=read("about/index.html");
for(const [re,value,label] of [
[/<title>[\s\S]*?<\/title>/,"<title>오늘의 핫딜 | 생활비서</title>","title"],
[/<meta name="description"[^>]*>/,'<meta name="description" content="여러 쇼핑몰의 인기 상품을 모아보고 원하는 상품을 검색하세요.">',"description"],
[/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+'/deals/">',"canonical"],
[/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex,follow">',"robots"],
[/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="오늘의 핫딜 | 생활비서">',"ogtitle"],
[/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="인기 쇼핑 상품을 한곳에서 확인하세요.">',"ogdescription"],
[/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+'/deals/">',"ogurl"],
[/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+content+'</main>',"main"],
[/<\/head>/,'<link rel="stylesheet" href="/adpick-deals.css?v=20261106c"><script defer src="/adpick-deals.js?v=20261106c"></script></head>',"head"]
])html=replace(html,re,value,label);
write("deals/index.html",html);

// Feature entry below the homepage hero. Does not request the API on the home page.
let home=read("index.html");
const heroStart=home.indexOf('<section class="hero portal-home-hero">');
if(heroStart<0)throw Error("[adpick-biz] homepage hero missing");
const heroEnd=home.indexOf("</section>",heroStart);
if(heroEnd<0)throw Error("[adpick-biz] homepage hero is unclosed");
const insertAt=heroEnd+"</section>".length;
const entry='<section class="adpick-home-entry" aria-label="핫딜 바로가기">'
+'<div><span class="adpick-home-tag">쇼핑</span><h2>오늘의 핫딜</h2>'
+'<p>인기 상품을 한곳에서 확인해 보세요.</p></div>'
+'<a href="/deals/" class="adpick-home-link">핫딜 보러가기</a></section>';
home=home.slice(0,insertAt)+entry+home.slice(insertAt);
if(!home.includes('href="/adpick-deals.css"'))
  home=home.replace('</head>','<link rel="stylesheet" href="/adpick-deals.css?v=20261106c"></head>');
write("index.html",home);
console.log("[adpick-biz] /deals/ live affiliate widget added, no product data stored.");