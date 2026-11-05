import fs from 'node:fs';
import path from 'node:path';

// A useful indexable food hub, with a live shopping search only after user click.
const DIST = path.resolve('dist');
const SITE = 'https://pagero.kr/life';
const read = name => fs.readFileSync(path.join(DIST,name), 'utf8');
const save = (name,content) => {
  const filename = path.join(DIST,name);
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  fs.writeFileSync(filename,content);
};
const esc = value => String(value).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const title='제철음식·오늘 뭐 먹지·장보기 | 생활비서';
const desc='월별 제철 식재료와 쉬운 집밥 메뉴, 재료 보관법, 제휴 쇼핑 상품 검색을 한곳에서 확인하세요.';
const items=[
  {name:'삼치',kind:'수산물',recipe:'삼치 소금구이',method:'물기를 제거한 삼치에 소금을 가볍게 뿌리고 속까지 익도록 굽습니다.',keep:'구입 후 냉장 상태로 짧게 보관하고, 바로 먹지 않는다면 소분해 냉동하세요.',query:'삼치'},
  {name:'가리비',kind:'수산물',recipe:'가리비찜',method:'껍데기를 씻고 충분히 가열해 익힌 뒤 취향에 따라 버터를 곁들입니다.',keep:'신선도가 중요한 조개류입니다. 냉장 유통 상태를 확인하고 구입 후 신속히 조리하세요.',query:'가리비'},
  {name:'가을무',kind:'채소',recipe:'소고기뭇국',method:'무를 나박 썰어 소고기와 볶은 다음 물을 넣고 부드럽게 끓입니다.',keep:'잎을 분리하고 수분이 지나치게 빠지지 않도록 감싸 냉장 보관하세요.',query:'국산 무'},
  {name:'배추',kind:'채소',recipe:'배춧국',method:'배추를 먹기 좋은 크기로 썰어 된장 푼 육수에 끓입니다.',keep:'겉잎을 남겨 감싸고 냉장 보관하며, 잘린 단면은 마르지 않도록 덮으세요.',query:'배추'},
  {name:'단감',kind:'과일',recipe:'단감 샐러드',method:'단감을 얇게 썰어 잎채소와 섞고 올리브유로 간단히 마무리합니다.',keep:'익은 과일은 냉장 보관하고, 눌린 부위가 있는지 살펴 먼저 드세요.',query:'단감'},
  {name:'고구마',kind:'뿌리채소',recipe:'군고구마',method:'씻어 물기를 닦은 뒤 오븐이나 에어프라이어에서 속까지 익혀 먹습니다.',keep:'물기 없는 통풍이 잘되는 서늘한 곳에 두고, 저온 냉장 보관은 피하세요.',query:'고구마'}
];
const cards=items.map(item=>'<article class="food-card"><div class="food-card-top"><span class="food-kind">'+esc(item.kind)+'</span><h3>'+esc(item.name)+'</h3></div>'
 +'<p class="food-recipe"><strong>추천 메뉴</strong> '+esc(item.recipe)+'</p>'
 +'<p>'+esc(item.method)+'</p><p class="food-keep"><strong>보관 팁</strong> '+esc(item.keep)+'</p>'
 +'<a class="food-buy" href="/deals/?q='+encodeURIComponent(item.query)+'">관련 상품 검색 <span aria-hidden="true">↗</span></a></article>').join('');
const months=Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'"'+(i===10?' selected':'')+'>'+(i+1)+'월</option>').join('');
const main='<div class="site-shell"><article class="food-hub">'
 +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 제철음식</nav>'
 +'<header class="food-hero"><p class="food-eyebrow">식재료 · 집밥 · 장보기</p>'
 +'<h1>제철음식</h1><p>이번 달 먹기 좋은 재료를 살펴보고 오늘의 메뉴와 필요한 장보기까지 이어서 확인하세요.</p></header>'
 +'<section class="food-section" aria-labelledby="food-month-heading"><div class="food-section-head"><div><h2 id="food-month-heading">11월 제철 식재료</h2><p>지역과 수확·어획 시기에 따라 실제 제철은 달라질 수 있습니다.</p></div>'
 +'<label class="food-month-label" for="food-month">월 선택 <select id="food-month">'+months+'</select></label></div>'
 +'<div class="food-grid" id="food-list" aria-live="polite">'+cards+'</div>'
 +'<p class="food-source">2026년 11월 수산물 삼치·가리비류: <a href="https://www.mof.go.kr/doc/ko/selectDoc.do?bbsSeq=10&amp;docSeq=69193&amp;menuSeq=971" target="_blank" rel="noopener noreferrer">해양수산부 발표 확인</a></p></section>'
 +'<section class="food-section food-choice" aria-labelledby="food-choice-heading"><div><h2 id="food-choice-heading">오늘 뭐 먹지?</h2><p>이번 달 식재료를 활용한 집밥 메뉴를 하나 골라보세요.</p><p id="food-result" class="food-choice-result" role="status">오늘의 추천: 삼치 소금구이</p></div>'
 +'<button id="food-pick" type="button">다른 메뉴 추천</button></section>'
 +'<section class="food-section food-shopping" aria-labelledby="food-shopping-heading"><h2 id="food-shopping-heading">이번 주 장보기</h2>'
 +'<p>필요한 재료를 먼저 정하고 구매하세요. 아래 링크는 기존 제휴 상품 검색 메뉴로 이동합니다.</p>'
 +'<a href="/deals/" class="food-all-deals">제휴 추천상품 전체 보기 <span aria-hidden="true">↗</span></a>'
 +'<p class="food-disclosure">제휴 상품 링크를 통해 구매하면 운영자가 수수료를 제공받을 수 있습니다. 실제 가격과 판매조건은 판매처에서 확인하세요.</p></section>'
 +'</article></div>';
let html=read('about/index.html');
const swaps=[
  [/<title>[\s\S]*?<\/title>/,'<title>'+esc(title)+'</title>','title'],
  [/<meta name="description"[^>]*>/,'<meta name="description" content="'+esc(desc)+'">','description'],
  [/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+'/food/">','canonical'],
  [/<meta name="robots"[^>]*>/,'<meta name="robots" content="index,follow">','robots'],
  [/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="'+esc(title)+'">','og:title'],
  [/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="'+esc(desc)+'">','og:description'],
  [/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+'/food/">','og:url'],
  [/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+main+'</main>','main']
];
for(const [re,next,label] of swaps){
  if(!re.test(html))throw Error('[food] template missing '+label);
  html=html.replace(re,next);
}
html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
const schema={'@context':'https://schema.org','@type':'CollectionPage',name:title,description:desc,
  url:SITE+'/food/',inLanguage:'ko',isPartOf:{'@type':'WebSite',name:'생활비서',url:SITE+'/'}};
html=html.replace('</head>','<link rel="stylesheet" href="/life-food.css"><script defer src="/life-food.js"></script>'
 +'<script type="application/ld+json">'+JSON.stringify(schema)+'</script></head>');
if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)throw Error('[food] single H1 expected');
save('food/index.html',html);

let sitemap=read('sitemap.xml');
if(!sitemap.includes('<loc>'+SITE+'/food/</loc>')){
  sitemap=sitemap.replace('</urlset>','<url><loc>'+SITE+'/food/</loc><lastmod>2026-11-06</lastmod></url></urlset>');
  save('sitemap.xml',sitemap);
}
const search=JSON.parse(read('search-index.json'));
if(!search.some(item=>item.url==='/food/'))search.push({title,description:desc,url:'/food/',
  keywords:['제철음식','제철 식재료','제철 레시피','오늘 뭐 먹지','장보기','식재료 보관법','11월 제철음식']});
save('search-index.json',JSON.stringify(search));
console.log('[food] /food/ monthly food hub, menu picker, recipes, storage tips and existing ADPICK shopping search linked.');
