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
  ['자동차','/car/','검사·명의이전·자동차세','car'],
  ['지원금·복지','/support/','정부지원금·복지제도','support'],
  ['주거·부동산','/support/housing-benefit-2026/','주거급여 신청과 대상','house'],
  ['세금·환급','/support/year-end-tax-precheck-2026/','연말정산 공제·환급','receipt'],
  ['취업·노동','/support/unemployment-benefit-eligibility-2026/','실업급여 수급 자격','work'],
  ['생활·건강','/support/flu-vaccination-children-2026/','예방접종·생활지원','health']
];
for(const [,href] of items){
  const target=href.slice(1)+'index.html';
  check(fs.existsSync(path.join(DIST,target)),'missing category destination '+href);
}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const iconPaths={
  car:'<path d="m5 11 2-5h10l2 5M5 11h14l2 3v5h-3v-2H6v2H3v-5l2-3Z"/><path d="M7 14h1m8 0h1"/>',
  support:'<path d="M12 21s-8-5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6-8 11-8 11Z"/>',
  house:'<path d="m3 11 9-8 9 8v10H3V11Z"/><path d="M9 21v-7h6v7"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
  work:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  health:'<path d="M12 21S3 16 3 10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 11-9 11Z"/><path d="M7 12h3l2-3 2 6 2-3h2"/>',
  calculator:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6M9 11h2m3 0h1M9 15h2m3 0h1M9 19h2m3 0h1"/>'
};
const topicIcon=key=>'<span class="topics-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">'+iconPaths[key]+'</svg></span>';
const rows=items.map(([label,href,detail,icon])=>
  '<a class="topics-hub-link" href="'+esc(href)+'">'
  +topicIcon(icon)+'<span class="topics-card-copy"><strong>'+esc(label)+'</strong>'
  +'<span class="topics-card-desc">'+esc(detail)+'</span></span>'
  +'<span aria-hidden="true" class="topics-chevron">→</span></a>'
).join('');
const calculator='<a class="topics-hub-link topics-hub-link--calculator" href="/tools/car-cost/">'
  +topicIcon('calculator')+'<span class="topics-card-copy"><strong>자동차 유지비 계산기</strong>'
  +'<span class="topics-card-desc">보험·연료비·세금·정비비를 한 번에 계산</span></span>'
  +'<span aria-hidden="true" class="topics-chevron">→</span></a>';
const inside='<div class="site-shell"><article class="portal-page topics-page">'
  +'<nav class="portal-breadcrumbs" aria-label="현재 위치"><a href="/">홈</a> / 생활정보</nav>'
  +'<header class="topics-heading">'
  +'<h1>생활정보</h1>'
  +'<p class="topics-intro">자동차, 지원금, 주거, 세금까지 생활에 필요한 내용을 빠르게 찾아보세요.</p>'
  +'</header>'
  +'<section class="topics-directory" aria-labelledby="topics-section-title">'
  +'<div class="topics-section-head"><h2 id="topics-section-title">분야별 정보</h2>'
  +'<p>원하는 분야를 선택하세요.</p></div>'
  +'<nav class="topics-hub-list" aria-label="생활정보 분야별 바로가기">'+rows+calculator+'</nav>'
  +'</section>'
  +'<section class="topics-shortcuts" aria-labelledby="topics-shortcuts-title">'
  +'<div class="topics-section-head"><h2 id="topics-shortcuts-title">자주 찾는 안내</h2>'
  +'<p>바로 확인할 수 있는 정보입니다.</p></div>'
  +'<div class="topics-quick">'
  +'<a href="/car/car-inspection-period/"><strong>자동차 검사기간</strong><span aria-hidden="true">→</span></a>'
  +'<a href="/support/housing-benefit-2026/"><strong>주거급여</strong><span aria-hidden="true">→</span></a>'
  +'<a href="/support/year-end-tax-precheck-2026/"><strong>연말정산</strong><span aria-hidden="true">→</span></a>'
  +'</div></section>'
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
// Finance supplies the shared HTML shell only. The lifestyle directory has
// no finance widgets, so remove the source page's versioned finance script and
// finance-only stylesheet instead of fetching 27KB+ of unused assets.
html=html.replace(/<script\b[^>]*\bsrc="\/finance-live\.js(?:\?[^"]*)?"[^>]*><\/script>/g,'');
html=html.replace(/<link\b[^>]*\bhref="\/finance-experience\.css(?:\?[^"]*)?"[^>]*>/g,'');
check(!/finance-live\.js|finance-experience\.css/.test(html),
  'inherited finance assets must not ship on the lifestyle directory');
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
