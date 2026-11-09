import fs from "node:fs";import path from "node:path";
// Static SEO-neutral shell. Live ADPICK for BIZ products are NOT persisted in dist.
const DIST=path.resolve("dist"),SITE="https://pagero.kr/life";
const read=p=>fs.readFileSync(path.join(DIST,p),"utf8");
const write=(p,body)=>{const file=path.join(DIST,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
const replace=(s,re,v,label)=>{if(!re.test(s))throw Error("ADPICK BIZ template missing: "+label);return s.replace(re,v);};
const content=`<div class="site-shell"><article class="adpick-deals">
<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> <span aria-hidden="true">/</span> 핫딜</nav>
<div class="adpick-hero">
<header class="adpick-page-heading">
<span class="adpick-eyebrow">HOT DEALS</span>
<h1>오늘의 핫딜</h1>
<p>인기 상품부터 원하는 제품까지 한 번에 찾아보세요.</p>
</header>
<form class="adpick-search" data-deals-search role="search">
<label class="sr-only" for="adpick-query">상품 검색</label>
<div class="adpick-search-field"><input type="search" name="q" id="adpick-query" minlength="2" maxlength="40" placeholder="어떤 상품을 찾으세요?" autocomplete="off" required></div>
<button type="submit">검색</button>
</form>
</div>
<section class="adpick-products" aria-labelledby="adpick-products-heading">
<div class="adpick-section-head"><h2 id="adpick-products-heading">상품 모아보기</h2></div>
<div class="adpick-filters" data-deals-filters role="group" aria-label="상품 분류"></div>
<div class="adpick-feed-row"><p class="adpick-meta" data-deals-status role="status">상품 영역이 보이면 상품을 불러옵니다.</p></div>
<div class="adpick-grid" data-deals-list aria-live="polite"></div>
</section>
<p class="adpick-disclosure">이 페이지에는 제휴 링크가 포함되어 있으며, 구매 시 운영자에게 수수료가 지급될 수 있습니다.</p>
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
[/<\/head>/,'<link rel="stylesheet" href="/adpick-deals.css?v=20261109a"><script defer src="/adpick-deals.js?v=20261109a"></script></head>',"head"]
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
  home=home.replace('</head>','<link rel="stylesheet" href="/adpick-deals.css?v=20261109a"></head>');
write("index.html",home);
console.log("[adpick-biz] /deals/ live affiliate widget added, no product data stored.");