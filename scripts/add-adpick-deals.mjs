import fs from "node:fs";import path from "node:path";
const DIST=path.resolve("dist"),SITE="https://pagero.kr/life";
const read=p=>fs.readFileSync(path.join(DIST,p),"utf8");
const write=(p,body)=>{const file=path.join(DIST,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
const replace=(s,re,v,label)=>{if(!re.test(s))throw Error("Adpick template missing: "+label);return s.replace(re,v);};
const content=`<div class="site-shell"><article class="adpick-deals">
<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 핫딜</nav>
<h1>오늘의 핫딜·할인상품</h1>
<p class="adpick-intro">여러 쇼핑몰의 할인상품을 모아봅니다. 실제 가격과 구매 조건은 판매처에서 확인하세요.</p>
<p class="adpick-disclosure"><strong>광고·제휴 안내</strong> · 이 페이지에는 제휴 링크가 포함되어 있습니다. 링크를 통한 구매 시 생활비서에 일정 수수료가 지급될 수 있으며, 구매자에게 별도 비용이 청구되지는 않습니다.</p>
<div class="adpick-section-head"><h2>판매 중인 상품</h2><span class="adpick-meta" data-deals-updated></span></div>
<div class="adpick-filters" data-deals-filters role="group" aria-label="상품 카테고리"></div>
<div class="adpick-toolbar"><span class="adpick-meta" data-deals-status role="status">상품을 확인하고 있습니다.</span>
<label><span class="sr-only">상품 정렬</span><select data-deals-sort><option value="default">기본순</option><option value="discount">할인율 높은순</option><option value="low">낮은 가격순</option></select></label></div>
<div class="adpick-grid" data-deals-list aria-live="polite"></div>
<p class="adpick-notes">자료 제공: 애드픽 쇼핑메이트. 표시 가격은 쿠폰·배송비·재고 및 판매처 변경 사항을 반영하지 못할 수 있습니다. 할인율은 API가 제공한 원래 가격과 판매가격으로 계산하며, 비교 가능한 두 가격이 없으면 표시하지 않습니다.</p>
</article></div>`;
let html=read("about/index.html");
for(const [re,value,label] of [
[/<title>[\s\S]*?<\/title>/,"<title>핫딜·할인상품 | 생활비서</title>","title"],
[/<meta name="description"[^>]*>/,'<meta name="description" content="애드픽 쇼핑메이트 제휴 할인상품을 분야별로 모아봅니다.">',"description"],
[/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+'/deals/">',"canonical"],
[/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="핫딜·할인상품 | 생활비서">',"ogtitle"],
[/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="쇼핑몰 할인상품 정보">',"ogdescription"],
[/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+'/deals/">',"ogurl"],
[/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+content+'</main>',"main"],
[/<\/head>/,'<link rel="stylesheet" href="/adpick-deals.css"><script defer src="/adpick-deals.js"></script></head>',"head"]
])html=replace(html,re,value,label);
write("deals/index.html",html);
const entries=JSON.parse(read("search-index.json"));
if(!entries.some(x=>x.url==="/deals/"))entries.push({title:"오늘의 핫딜·할인상품",
 description:"애드픽 쇼핑메이트 제휴 할인상품",keywords:["핫딜","할인","특가","쇼핑"],url:"/deals/"});
write("search-index.json",JSON.stringify(entries));
let sitemap=read("sitemap.xml");
if(!sitemap.includes("<loc>"+SITE+"/deals/</loc>"))sitemap=sitemap.replace("</urlset>",
 "<url><loc>"+SITE+"/deals/</loc><lastmod>2026-11-06</lastmod></url></urlset>");
write("sitemap.xml",sitemap);
console.log("[adpick] /deals/ built, API products served at /deals/api");