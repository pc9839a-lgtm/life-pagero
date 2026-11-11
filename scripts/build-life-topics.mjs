import fs from 'node:fs';
import path from 'node:path';

// A real category landing page: the primary '생활정보' menu must never point
// misleadingly to only /support/ while hiding all the /car/ articles.
const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const read=name=>fs.readFileSync(path.join(DIST,name),'utf8');
const save=(name,body)=>{
  const full=path.join(DIST,name);fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,body);
};
const check=(pass,message)=>{if(!pass)throw Error('[topics] '+message);};
const pageTitle='생활정보 | 자동차·지원금·주거·세금 | 생활비서';
const desc='자동차 검사·명의이전, 정부지원금, 주거·부동산, 취업·노동, 세금·생활정보를 분야별로 모았습니다.';
const destination='/topics/';
const items=[
  ['자동차','/car/','자동차 검사기간·명의이전·차량 관련 정보'],
  ['지원금·복지','/support/','정부지원금·복지제도'],
  ['주거·부동산','/support/housing-benefit-2026/','주거급여·주거 관련 정보'],
  ['세금·환급','/support/year-end-tax-precheck-2026/','연말정산·세금 정보'],
  ['취업·노동','/support/','취업지원·노동 관련 정보'],
  ['생활·건강','/support/','생활행정·건강 지원정보']
];
for(const [,href] of items){
  const target=href.slice(1)+'index.html';
  check(fs.existsSync(path.join(DIST,target)),'missing category destination '+href);
}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const rows=items.map(([label,href,detail])=>
  '<a class="topics-hub-link" href="'+esc(href)+'"><strong>'+esc(label)+'</strong>'
  +'<span>'+esc(detail)+'</span><span aria-hidden="true" class="topics-chevron">›</span></a>'
).join('');
const inside='<div class="site-shell"><article class="portal-page topics-page">'
  +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 생활정보</nav>'
  +'<div class="topics-heading">'
  +'<span class="topics-kicker">LIFE DIRECTORY · 필요한 생활정보</span>'
  +'<h1>생활정보</h1>'
  +'<p class="topics-intro">자동차·지원금·주거·세금까지.<br>생활에 필요한 정보를 분야별로 바로 찾아보세요.</p>'
  +'<div class="topics-quick"><span class="topics-quick-label">바로 확인</span>'
  +'<a href="/car/car-inspection-period/">자동차 검사기간 <span aria-hidden="true">↗</span></a>'
  +'<a href="/support/housing-benefit-2026/">주거급여 <span aria-hidden="true">↗</span></a>'
  +'<a href="/support/year-end-tax-precheck-2026/">연말정산 <span aria-hidden="true">↗</span></a></div></div>'
  +'<div class="topics-section-head"><div><small>EXPLORE 01</small><h2>분야별로 찾기</h2></div>'
  +'<span>관심 분야를 선택하세요</span></div>'
  +'<nav class="topics-hub-list" aria-label="생활정보 분야별 바로가기">'+rows+'</nav>'
  +'</article></div>';
let html=read('finance/index.html');
check(html.includes('<main id="main-content">'),'finance page template main missing');
html=html.replace(/<main id="main-content">[\s\S]*?<\/main>/,
  '<main id="main-content">'+inside+'</main>');
html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+pageTitle+'</title>')
  .replace(/<meta name="description"[^>]*>/,
    '<meta name="description" content="'+desc+'">')
  .replace(/<link rel="canonical"[^>]*>/,
    '<link rel="canonical" href="'+SITE+destination+'">')
  .replace(/<meta property="og:title"[^>]*>/,
    '<meta property="og:title" content="'+pageTitle+'">')
  .replace(/<meta property="og:description"[^>]*>/,
    '<meta property="og:description" content="'+desc+'">')
  .replace(/<meta property="og:url"[^>]*>/,
    '<meta property="og:url" content="'+SITE+destination+'">')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
const schema={'@context':'https://schema.org','@type':'CollectionPage',
  name:pageTitle,description:desc,url:SITE+destination,inLanguage:'ko',
  isPartOf:{'@type':'WebSite',name:'생활비서',url:SITE+'/'}};
html=html.replace('</head>','<script type="application/ld+json">'
  +JSON.stringify(schema)+'</script></head>');
html=html.replace('<script defer src="/finance-live.js"></script>','');
check((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,
  'must have one H1');
check((html.match(/<link rel="canonical"/g)||[]).length===1,
  'must have one canonical');
save('topics/index.html',html);

let sitemap=read('sitemap.xml');
if(!sitemap.includes('<loc>'+SITE+destination+'</loc>')){
  sitemap=sitemap.replace('</urlset>',
    '<url><loc>'+SITE+destination+'</loc><lastmod>2026-11-06</lastmod></url></urlset>');
  save('sitemap.xml',sitemap);
}
const index=JSON.parse(read('search-index.json'));
if(!index.some(row=>row.url===destination))index.push({
  title:pageTitle,description:desc,url:destination,
  keywords:['생활정보','자동차','지원금','복지','주거','부동산','세금','취업','노동']
});
save('search-index.json',JSON.stringify(index));
console.log('[topics] Added /topics/ with six existing category destinations, canonical, sitemap and search index.');
