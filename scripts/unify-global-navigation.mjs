import fs from 'node:fs';
import path from 'node:path';

// All site routes share one exact global navigation. Earlier build passes
// may add route-specific links; replace their entire global <nav> here once.
const DIST=path.resolve('dist');
const CSS='/life-global-nav.css';
const ITEMS=[
  {href:'/',label:'홈',section:'home'},
  {href:'/today/',label:'오늘',section:'today'},
  {href:'/events/',label:'축제·행사',section:'events'},
  {href:'/food/',label:'먹거리',section:'food'},
  {href:'/deals/',label:'핫딜',section:'deals'},
  {href:'/finance/',label:'금융',section:'finance'},
  {href:'/real-estate/',label:'분양정보',section:'real-estate'},
  {href:'/topics/',label:'생활정보',section:'topics'}
];
const esc=str=>String(str).replace(/[&<>"']/g,c=>({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
  const f=path.join(dir,ent.name);
  return ent.isDirectory()?files(f):[f];
});
const section=pathname=>{
  if(pathname==='/')return 'home';
  if(pathname.startsWith('/today/'))return 'today';
  if(pathname.startsWith('/events/'))return 'events';
  if(pathname.startsWith('/deals/'))return 'deals';
  if(pathname.startsWith('/food/'))return 'food';
  if(pathname.startsWith('/finance/'))return 'finance';
  if(pathname.startsWith('/real-estate/'))return 'real-estate';
  if(pathname.startsWith('/topics/') ||
     pathname.startsWith('/car/') ||
     pathname.startsWith('/tools/car-cost/') ||
     pathname.startsWith('/support/'))return 'topics';
  return '';
};
const render=active=>'<nav class="main-nav" aria-label="전체 메뉴"><div class="nav-inner">'
  +ITEMS.map(item=>'<a href="'+esc(item.href)+'"'
    +(item.section===active?' aria-current="page"':'')
    +'>'+esc(item.label)+'</a>').join('')
  +'</div></nav>';
let changed=0,skipped=0;
for(const file of files(DIST).filter(p=>p.endsWith('.html'))){
  const relative=path.relative(DIST,file).replaceAll(path.sep,'/');
  const pathname=relative==='index.html'?'/':('/'+relative.replace(/index\.html$/,''));
  let html=fs.readFileSync(file,'utf8');
  if(!html.includes('<header class="site-header">')){skipped++;continue;}
  const nav=/<nav\b[^>]*\bclass="main-nav"[^>]*>[\s\S]*?<\/nav>/g;
  const count=[...html.matchAll(nav)].length;
  if(count!==1)throw Error('[nav] Expected exactly one global menu in '+relative+', got '+count);
  html=html.replace(nav,render(section(pathname)));
  // One visually identical search action on every mobile header. The desktop
  // keeps its existing working search form; the home icon opens its local form.
  const searchHref=pathname==='/'?'#life-home-search':'/search/';
  const searchAction='<a class="life-header-search-toggle" href="'+searchHref+'" aria-label="검색" title="검색">'
    +'<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
    +'<circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/></svg></a>';
  const headerClose='</div><nav class="main-nav"';
  if(!html.includes(headerClose))throw Error('[nav] Header insertion point missing: '+relative);
  if(html.includes('class="life-header-search-toggle"'))
    throw Error('[nav] Duplicate site search control: '+relative);
  html=html.replace(headerClose,searchAction+headerClose);
  if(!html.includes('href="'+CSS+'"')){
    if(!html.includes('</head>'))throw Error('[nav] Document head missing: '+relative);
    html=html.replace('</head>','<link rel="stylesheet" href="'+CSS+'"></head>');
  }
  fs.writeFileSync(file,html);
  changed++;
}
if(changed<140)throw Error('[nav] Too few navigation documents: '+changed);
console.log('[nav] One identical 8-link menu and mobile search across '+changed+' pages; '+skipped+' non-site pages skipped.');
