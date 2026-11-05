import fs from "node:fs";import path from "node:path";
// Static SEO-neutral shell. Live ADPICK for BIZ products are NOT persisted in dist.
const DIST=path.resolve("dist"),SITE="https://pagero.kr/life";
const read=p=>fs.readFileSync(path.join(DIST,p),"utf8");
const write=(p,body)=>{const file=path.join(DIST,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
const replace=(s,re,v,label)=>{if(!re.test(s))throw Error("ADPICK BIZ template missing: "+label);return s.replace(re,v);};
const content=`<div class="site-shell"><article class="adpick-deals">
<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 추천상품</nav>
<h1>쇼핑 추천상품</h1>
<p class="adpick-intro">여러 제휴 쇼핑몰의 인기 상품을 조회할 수 있습니다. 표시 가격은 참고용이며 실제 판매가와 혜택은 판매처에서 확인하세요.</p>
<p class="adpick-disclosure"><strong>광고·제휴 안내</strong> · 애드픽 제휴 링크가 포함되어 있으며, 링크를 통한 구매 시 운영자에게 수수료가 지급될 수 있습니다.</p>
<div class="adpick-section-head"><h2>추천 상품</h2><span class="adpick-meta">애드픽 비즈 API 제공</span></div>
<div class="adpick-filters" data-deals-filters role="group" aria-label="추천상품 종류"></div>
<form class="adpick-toolbar adpick-search" data-deals-search role="search"><label for="adpick-query">상품 검색</label>
<input type="search" name="q" id="adpick-query" minlength="2" maxlength="40" placeholder="상품 이름 입력" required>
<button type="submit">검색</button></form>
<p class="adpick-meta" data-deals-status role="status">상품을 확인하고 있습니다.</p>
<div class="adpick-grid" data-deals-list aria-live="polite"></div>
<p class="adpick-notes">상품명·이미지·가격·제휴링크는 애드픽 비즈 API가 제공한 정보를 조회 시점에 표시합니다. 상품 데이터를 별도로 저장하거나 할인율을 계산하지 않습니다. 실제 가격·쿠폰·배송·재고 및 혜택은 제휴몰에서 확인하세요. 이 페이지의 상품은 검증된 가격 인하 상품이라는 의미가 아닙니다.</p>
</article></div>`;
let html=read("about/index.html");
for(const [re,value,label] of [
[/<title>[\s\S]*?<\/title>/,"<title>쇼핑 추천상품 | 생활비서</title>","title"],
[/<meta name="description"[^>]*>/,'<meta name="description" content="애드픽 비즈 제휴 쇼핑몰의 인기 상품을 검색하고 확인할 수 있습니다.">',"description"],
[/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+'/deals/">',"canonical"],
[/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex,follow">',"robots"],
[/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="쇼핑 추천상품 | 생활비서">',"ogtitle"],
[/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="제휴 쇼핑몰 인기상품 정보">',"ogdescription"],
[/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+'/deals/">',"ogurl"],
[/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+content+'</main>',"main"],
[/<\/head>/,'<link rel="stylesheet" href="/adpick-deals.css"><script defer src="/adpick-deals.js"></script></head>',"head"]
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
+'<div><span class="adpick-home-tag">쇼핑</span><h2>오늘의 핫딜·추천상품</h2>'
+'<p>제휴 쇼핑몰의 인기 상품을 모아볼 수 있습니다. 실제 할인 여부와 가격은 판매처에서 확인하세요.</p></div>'
+'<a href="/deals/" class="adpick-home-link">핫딜 보러가기</a></section>';
home=home.slice(0,insertAt)+entry+home.slice(insertAt);
if(!home.includes('href="/adpick-deals.css"'))
  home=home.replace('</head>','<link rel="stylesheet" href="/adpick-deals.css"></head>');
write("index.html",home);
console.log("[adpick-biz] /deals/ live affiliate widget added, no product data stored.");