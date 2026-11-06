import fs from 'node:fs';
import path from 'node:path';

const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const dataset=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
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
  return '<section class="food-guide-section"><h2>'+esc(section.title)+'</h2>'+body+'</section>';
};
const cards=[];
for(const guide of dataset.guides){
  check(/^[a-z0-9-]+$/.test(guide.slug),'unsafe slug '+guide.slug);
  check(guide.sections.length>=4 && guide.faq.length>=2 && guide.sources.length>=2,
    'missing detailed editorial sections '+guide.slug);
  check(guide.sources.every(([,url])=>url.startsWith('https://')),'non-HTTPS source '+guide.slug);
  const url='/food/'+guide.slug+'/';
  const facts='<dl class="food-guide-facts">'+guide.facts.map(([name,value])=>
    '<div><dt>'+esc(name)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>';
  const faq='<section class="food-guide-section food-guide-faq"><h2>자주 묻는 질문</h2>'
    +guide.faq.map(([question,answer])=>'<div class="food-guide-qa"><h3>'
    +esc(question)+'</h3><p>'+esc(answer)+'</p></div>').join('')+'</section>';
  const body='<div class="site-shell"><article class="food-guide" itemscope itemtype="https://schema.org/Article">'
    +'<nav class="portal-breadcrumbs" aria-label="현재 위치">'
    +'<a href="/">홈</a> / <a href="/food/">먹거리</a> / '+esc(guide.title)+'</nav>'
    +'<header class="food-guide-header"><span class="food-guide-category">'+esc(guide.eyebrow)+'</span>'
    +'<h1 itemprop="headline">'+esc(guide.title)+'</h1>'
    +'<p class="food-guide-lead" itemprop="description">'+esc(guide.lead)+'</p>'
    +'<time datetime="'+dataset.publishedAt+'">2026.11.06</time></header>'
    +facts
    +'<div class="food-guide-content" itemprop="articleBody">'
    +guide.sections.map(renderSection).join('')+faq
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
  const articleSchema={
    '@context':'https://schema.org','@type':'Article',
    headline:guide.title,description:guide.description,
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
    +'<span>'+esc(guide.eyebrow)+'</span><strong>'+esc(guide.title)+'</strong>'
    +'<small>'+esc(guide.description)+'</small></a>');
}
check(cards.length===2,'expected exactly two substantive food articles');
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
console.log('[food-guides] Published 2 full articles, linked on /food/, added canonical/Article/Breadcrumb, sitemap and site search.');
