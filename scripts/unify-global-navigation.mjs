import fs from 'node:fs';
import path from 'node:path';

// All site routes share one exact global navigation. Earlier build passes
// may add route-specific links; replace their entire global <nav> here once.
const DIST=path.resolve('dist');
const CSS='/life-global-nav.css';
const ITEMS=[
  {href:'/',label:'홈',section:'home'},
  {href:'/today/',label:'오늘',section:'today'},
  {href:'/finance/',label:'금융',section:'finance'},
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
  if(pathname.startsWith('/finance/'))return 'finance';
  if(pathname.startsWith('/topics/') ||
     pathname.startsWith('/car/') ||
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
  if(!html.includes('href="'+CSS+'"')){
    if(!html.includes('</head>'))throw Error('[nav] Document head missing: '+relative);
    html=html.replace('</head>','<link rel="stylesheet" href="'+CSS+'"></head>');
  }
  fs.writeFileSync(file,html);
  changed++;
}
if(changed<140)throw Error('[nav] Too few navigation documents: '+changed);
console.log('[nav] One identical 4-link menu across '+changed+' pages; '+skipped+' non-site pages skipped.');
