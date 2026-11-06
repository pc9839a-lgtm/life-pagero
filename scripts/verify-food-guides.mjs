import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const model=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const read=file=>fs.readFileSync(path.join(DIST,file),'utf8');
const check=(ok,message)=>{if(!ok)throw Error('[food-guides-qa] '+message)};
check(model.guides.length===2,'exactly two verified original guide entries expected');
const sitemap=read('sitemap.xml');
const index=JSON.parse(read('search-index.json'));
const food=read('food/index.html');
const originalHub=['id="food-month"','id="food-list"','id="food-pick"',
  'id="food-shopping-list"','id="food-servings"','id="food-clear-all"',
  '제휴 상품 링크를 통해 구매하면'];
for(const key of originalHub)check(food.includes(key),'original /food/ functionality missing '+key);
const css=read('life-editorial-20261106.css');
const hash=createHash('sha256').update(css).digest('hex').slice(0,12);
for(const cssMarker of ['.food-guide-header','.food-guide-facts','.food-guide-steps',
  '.food-guide-table-wrap','.food-guides-index-list','@media(max-width:700px)'])
  check(css.includes(cssMarker),'guide mobile/readability rule missing '+cssMarker);
const slugs=new Set(model.guides.map(g=>g.slug));
for(const guide of model.guides){
  const pathname='/food/'+guide.slug+'/';
  const html=read('food/'+guide.slug+'/index.html');
  const body=guide.sections.map(s=>JSON.stringify(s)).join('');
  check(body.length>1000,'guide lacks substantive original instructions '+guide.slug);
  check(!/(무엇을 알아볼까요|이번 글에서는|알아보겠습니다|확인해 보겠습니다|지금부터|정리해 드리겠습니다|도움이 되었기를)/.test(html),
    'AI-style explanatory filler appeared in '+guide.slug);
  check(html.includes('name="robots" content="index,follow"'),'article noindex '+guide.slug);
  check(html.includes('<link rel="canonical" href="'+SITE+pathname+'">'),
    'article canonical wrong '+guide.slug);
  check((html.match(/<link rel="canonical"/g)||[]).length===1,
    'duplicate canonical '+guide.slug);
  check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
    'duplicate H1 '+guide.slug);
  check(html.includes('<h1 itemprop="headline">'+guide.title+'</h1>'),
    'search headline mismatch '+guide.slug);
  check(html.includes('<title>'+guide.seoTitle+'</title>'),
    'SEO title mismatch '+guide.slug);
  check(html.includes('<meta name="description" content="'+guide.description+'">'),
    'unique meta description lost '+guide.slug);
  check(html.includes('href="/life-editorial-20261106.css?v='+hash+'"'),
    'single content-hashed theme missing '+guide.slug);
  check(!html.includes('href="/life-food.css"')&&!html.includes('src="/life-food.js"'),
    'unused large food picker bundle on article '+guide.slug);
  check(html.includes('<nav class="main-nav" aria-label="전체 메뉴">')&&
    html.includes('<a href="/food/" aria-current="page">먹거리</a>'),
    'shared food active navigation missing '+guide.slug);
  check((html.match(/<script type="application\/ld\+json">/g)||[]).length===2,
    'Article and Breadcrumb JSON-LD expected '+guide.slug);
  check(html.includes('"@type":"Article"')&&html.includes('"@type":"BreadcrumbList"'),
    'structured article/breadcrumb data missing '+guide.slug);
  check(html.includes('<time datetime="'+model.publishedAt+'">'),
    'publication date lost '+guide.slug);
  check(guide.sections.every(s=>html.includes('<h2>'+s.title+'</h2>')),
    'article sections lost '+guide.slug);
  check(guide.faq.every(([q,a])=>html.includes(q)&&html.includes(a)),
    'practical FAQ answers missing '+guide.slug);
  check(guide.sources.length>=2&&guide.sources.every(([label,url])=>
    url.startsWith('https://')&&html.includes(label)&&
    html.includes(new URL(url).hostname)),
    'unverified official citations missing '+guide.slug);
  check(guide.sources.every(([,url])=>
    ['www.mof.go.kr','www.foodsafetykorea.go.kr','www.rda.go.kr','www.fda.gov'].includes(new URL(url).hostname)),
    'unexpected source domain '+guide.slug);
  check(html.includes('href="/food/'+guide.related+'/"')&&slugs.has(guide.related),
    'related food guide internal link broken '+guide.slug);
  check(food.includes('class="food-guide-index-link" href="'+pathname+'"'),
    'food hub lacks visible article link '+guide.slug);
  check(sitemap.includes('<loc>'+SITE+pathname+'</loc>')&&
    sitemap.includes('<lastmod>'+model.publishedAt+'</lastmod>'),
    'article missing sitemap/lastmod '+guide.slug);
  check(index.some(x=>x.url===pathname&&x.title===guide.seoTitle),
    'article not searchable '+guide.slug);
}
check((food.match(/class="food-guide-index-link"/g)||[]).length===2,
  'two and only two content links expected on food index');
console.log('[food-guides-qa] PASS: 2 fully written SEO articles, source citations, 2 FAQ groups, single theme/mobile rules, shared navigation, hub links, index and sitemap.');
