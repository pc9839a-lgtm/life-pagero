import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const dataset=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const SHOP_SCRIPT='/food-guide-products.js';
const SHOP_HASH=createHash('sha256').update(fs.readFileSync(path.join(DIST,SHOP_SCRIPT.slice(1)))).digest('hex').slice(0,12);
const SHOP_SCRIPT_HREF=SHOP_SCRIPT+'?v='+SHOP_HASH;
// Photographs are copied at build time when Wikimedia is reachable, then
// served locally by Cloudflare Pages. The original Commons URL is retained as
// a fallback and for the photographer/license credit.
const photoManifest=JSON.parse(fs.readFileSync(
  path.join(DIST,'food-images/manifest.json'),'utf8'));
const imageUrl=photo=>photoManifest[photo.filename];
const publicImageUrl=photo=>{
  const url=imageUrl(photo);
  return url.startsWith('/')?SITE+url:url;
};
const figure=(photo,hero=false)=>{
  const attribution='<a href="'+esc(photo.source)+'" target="_blank" rel="noopener noreferrer">'
    +esc(photo.attribution)+'</a>';
  return '<figure class="food-guide-photo'+(hero?' food-guide-photo-hero':'')+'">'
    +'<img src="'+esc(imageUrl(photo))+'" alt="'+esc(photo.alt)+'" width="960" height="640" '
    +'loading="'+(hero?'eager':'lazy')+'" decoding="async" '
    +(hero?'fetchpriority="high" ':'')
    +'referrerpolicy="no-referrer">'
    +'<figcaption>'+esc(photo.caption)+' · 사진: '+attribution+'</figcaption></figure>';
};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const read=rel=>fs.readFileSync(path.join(DIST,rel),'utf8');
const write=(rel,html)=>{
  const full=path.join(DIST,rel);
  fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,html);
};
const fail=message=>{throw Error('[food-guides] '+message)};
const check=(ok,message)=>{if(!ok)fail(message)};
const sourceList=guide=>guide.sources.map(([label,url])=>
  '<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'
  +esc(label)+'</a></li>').join('');
const renderSection=section=>{
  let body='';
  if(section.type==='paragraphs')
    body=section.paragraphs.map(text=>'<p>'+esc(text)+'</p>').join('');
  else if(section.type==='list')
    body='<ul>'+section.items.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul>';
  else if(section.type==='steps')
    body='<ol class="food-guide-steps">'+section.steps.map(([heading,detail])=>
      '<li><strong>'+esc(heading)+'</strong><p>'+esc(detail)+'</p></li>').join('')+'</ol>';
  else if(section.type==='recipe')
    body='<h3>재료</h3><ul class="food-guide-ingredients">'+section.ingredients.map(([ingredient,amount])=>
      '<li><span>'+esc(ingredient)+'</span><strong>'+esc(amount)+'</strong></li>').join('')+'</ul>'
      +'<h3>조리 순서</h3><ol class="food-guide-steps">'+section.steps.map(text=>
      '<li>'+esc(text)+'</li>').join('')+'</ol>';
  else if(section.type==='table')
    body='<div class="food-guide-table-wrap"><table><thead><tr>'
      +section.head.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')
      +'</tr></thead><tbody>'+section.rows.map(row=>'<tr>'
      +row.map((cell,i)=>(i===0?'<th scope="row">':'<td>')+esc(cell)+(i===0?'</th>':'</td>')).join('')
      +'</tr>').join('')+'</tbody></table></div>';
  else fail('unknown section type '+section.type);
  const visual=section.visual||null;
  return '<section class="food-guide-section" id="food-'+encodeURIComponent(section.title)+'">'
    +'<h2>'+esc(section.title)+'</h2>'
    +(visual?figure(visual):'')+body+'</section>';
};
const cards=[];
for(const guide of dataset.guides){
  check(/^[a-z0-9-]+$/.test(guide.slug),'unsafe slug '+guide.slug);
  check(guide.sections.length>=4 && guide.faq.length>=2 && guide.sources.length>=2,
    'missing detailed editorial sections '+guide.slug);
  check(guide.sources.every(([,url])=>url.startsWith('https://')),'non-HTTPS source '+guide.slug);
  check(typeof guide.shoppingQuery==='string' && guide.shoppingQuery.trim().length>=2
    && guide.shoppingQuery.length<=40,'invalid ADPICK query '+guide.slug);
  const url='/food/'+guide.slug+'/';
  const shopQuery=guide.shoppingQuery.trim();
  check(Array.isArray(guide.visuals)&&guide.visuals.length===2,
    'food guide must have 2 licensed photographs '+guide.slug);
  const hero=guide.visuals.find(x=>x.placement==='hero');
  check(hero&&hero.alt&&hero.source,'missing credited hero photo '+guide.slug);
  for(const section of guide.sections){
    section.visual=guide.visuals.find(x=>x.placement===section.title)||null;
  }
  const navLinks=guide.sections.map((section,i)=>
    '<a href="#food-'+encodeURIComponent(section.title)+'">'+esc(section.title)+'</a>'
    +(i===1?'<a href="#food-shopping">관련 상품</a>':'')).join('');
  const contents='<nav class="food-guide-contents" aria-label="이 글의 목차"><strong>바로가기</strong>'
    +'<div>'+navLinks+'</div></nav>';
  const takeaway='<ul class="food-guide-highlights">'
    +guide.summaryPoints.map(point=>'<li>'+esc(point)+'</li>').join('')+'</ul>';
  const shopping='<section class="food-guide-shop" id="food-shopping" aria-labelledby="food-guide-shop-heading" '
    +'data-food-guide-products="'+esc(shopQuery)+'">'
    +'<div class="food-shop-heading"><h2 id="food-guide-shop-heading">관련 상품</h2></div>'
    +'<p class="food-shop-status" data-food-shop-status role="status">상품 조회 중</p>'
    +'<div class="food-shop-list" data-food-shop-results aria-live="polite"></div>'
    +'<div class="food-shop-actions">'
    +'<a class="food-shop-search-link" href="/deals/?q='+encodeURIComponent(shopQuery)+'&amp;src=food">상품 더 찾아보기</a>'
    +'<button class="food-shop-retry" type="button" data-food-shop-retry hidden>다시 불러오기</button>'
    +'</div>'
    +'<p class="food-shop-disclosure">제휴 링크로 구매하면 수수료를 받을 수 있습니다.</p>'
    +'</section>';
  const facts='<dl class="food-guide-facts">'+guide.facts.map(([name,value])=>
    '<div><dt>'+esc(name)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>';
  const faq='<section class="food-guide-section food-guide-faq"><h2>꿀팁</h2>'
    +guide.faq.map(([question,answer])=>'<div class="food-guide-qa"><h3>'
    +esc(question)+'</h3><p>'+esc(answer)+'</p></div>').join('')+'</section>';
  const body='<div class="site-shell"><article class="food-guide" itemscope itemtype="https://schema.org/Article">'
    +'<nav class="portal-breadcrumbs" aria-label="현재 위치">'
    +'<a href="/">홈</a> / <a href="/food/">먹거리</a> / '+esc(guide.title)+'</nav>'
    +'<header class="food-guide-header"><span class="food-guide-category">'+esc(guide.eyebrow)+'</span>'
    +'<h1 itemprop="headline">'+esc(guide.title)+'</h1>'
    +'<p class="food-guide-lead" itemprop="description">'+esc(guide.lead)+'</p>'
    +'<time datetime="'+dataset.publishedAt+'">2026.11.06</time></header>'
    +figure(hero,true)+facts+takeaway+contents
    +'<div class="food-guide-content" itemprop="articleBody">'
    +guide.sections.map((section,i)=>renderSection(section)+(i===1?shopping:'')).join('')+faq
    +'</div>'
    +'<section class="food-guide-sources"><h2>참고 자료</h2><ul>'
    +sourceList(guide)+'</ul></section>'
    +'<nav class="food-guide-related" aria-label="관련 글">'
    +'<a href="/food/">제철음식 전체</a>'
    +'<a href="/food/'+esc(guide.related)+'/">'+esc(guide.relatedLabel)+'</a></nav>'
    +'</article></div>';
  let html=read('food/index.html');
  check(html.includes('<header class="site-header">'),'food page template missing site header');
  const seo=[
    [/<title>[\s\S]*?<\/title>/,'<title>'+esc(guide.seoTitle)+'</title>'],
    [/<meta name="description"[^>]*>/,'<meta name="description" content="'+esc(guide.description)+'">'],
    [/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+SITE+url+'">'],
    [/<meta property="og:title"[^>]*>/,'<meta property="og:title" content="'+esc(guide.seoTitle)+'">'],
    [/<meta property="og:description"[^>]*>/,'<meta property="og:description" content="'+esc(guide.description)+'">'],
    [/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+SITE+url+'">'],
    [/<main id="main-content">[\s\S]*?<\/main>/,'<main id="main-content">'+body+'</main>']
  ];
  for(const [re,replacement] of seo){
    check(re.test(html),'page template missing SEO/semantic anchor '+guide.slug+': '+re);
    html=html.replace(re,replacement);
  }
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
  html=html.replace('<link rel="stylesheet" href="/life-food.css">','')
    .replace('<script defer src="/life-food.js"></script>','');
  html=html.replace('</head>','<script defer src="'+SHOP_SCRIPT_HREF+'"></script></head>');
  const ogImageTag='<meta property="og:image" content="'+esc(publicImageUrl(hero))+'">';
  if(/<meta property="og:image"[^>]*>/.test(html)){
    html=html.replace(/<meta property="og:image"[^>]*>/,ogImageTag);
  }else{
    html=html.replace('</head>',ogImageTag+'</head>');
  }
  const articleSchema={
    '@context':'https://schema.org','@type':'Article',
    headline:guide.title,description:guide.description,
    image:[publicImageUrl(hero)],
    datePublished:dataset.publishedAt,dateModified:dataset.publishedAt,
    inLanguage:'ko',mainEntityOfPage:SITE+url,
    author:{'@type':'Organization',name:'생활비서',url:SITE+'/'},
    publisher:{'@type':'Organization',name:'생활비서',url:SITE+'/'}
  };
  const breadcrumbSchema={
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'홈',item:SITE+'/'},
      {'@type':'ListItem',position:2,name:'먹거리',item:SITE+'/food/'},
      {'@type':'ListItem',position:3,name:guide.title,item:SITE+url}
    ]
  };
  html=html.replace('</head>','<script type="application/ld+json">'
    +JSON.stringify(articleSchema)+'</script><script type="application/ld+json">'
    +JSON.stringify(breadcrumbSchema)+'</script></head>');
  check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,'duplicate H1 '+guide.slug);
  check((html.match(/<link rel="canonical"/g)||[]).length===1,'duplicate canonical '+guide.slug);
  write('food/'+guide.slug+'/index.html',html);
  cards.push('<a class="food-guide-index-link" href="'+url+'">'
    +'<img class="food-guide-index-photo" src="'+esc(imageUrl(hero))+'" alt="'+esc(hero.alt)+'" width="480" height="270" loading="lazy" decoding="async">'
    +'<span>'+esc(guide.eyebrow)+'</span><strong>'+esc(guide.title)+'</strong>'
    +'<small>'+esc(guide.description)+'</small></a>');
}
check(cards.length===dataset.guides.length&&cards.length>=4,'food guide hub list must include all guides');
const before='<section class="food-section food-choice"';
let home=read('food/index.html');
check(home.includes(before),'food hub choice section not found');
const listing='<section class="food-section food-guides-index" aria-labelledby="food-guides-heading">'
  +'<h2 id="food-guides-heading">제철 식재료 손질·보관</h2>'
  +'<div class="food-guides-index-list">'+cards.join('')+'</div></section>';
home=home.replace(before,listing+before);
write('food/index.html',home);

let sitemap=read('sitemap.xml');
let index=JSON.parse(read('search-index.json'));
for(const guide of dataset.guides){
  const pathname='/food/'+guide.slug+'/';
  const loc='<loc>'+SITE+pathname+'</loc>';
  check(!sitemap.includes(loc),'duplicated sitemap entry '+pathname);
  sitemap=sitemap.replace('</urlset>',
    '<url>'+loc+'<lastmod>'+dataset.publishedAt+'</lastmod></url></urlset>');
  check(!index.some(item=>item.url===pathname),'duplicate search entry '+pathname);
  index.push({url:pathname,title:guide.seoTitle,description:guide.description,
    keywords:[guide.title,...guide.faq.map(([question])=>question),guide.eyebrow]});
}
write('sitemap.xml',sitemap);
write('search-index.json',JSON.stringify(index));
console.log('[food-guides] Published '+dataset.guides.length+' full articles, linked on /food/, with canonical/Article/Breadcrumb, sitemap and site search.');
