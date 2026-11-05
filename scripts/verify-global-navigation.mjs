import fs from 'node:fs';
import path from 'node:path';

const DIST=path.resolve('dist');
const EXPECTED=[
  ['/', '홈'], ['/today/','오늘'], ['/finance/','금융'],
  ['/topics/','생활정보']
];
const read=relative=>fs.readFileSync(path.join(DIST,relative),'utf8');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
  const f=path.join(dir,ent.name);
  return ent.isDirectory()?walk(f):[f];
});
const fail=(what,file)=>{throw Error('[nav-qa] '+what+' in '+file);};
let baseline=null,checked=0,selected=0;
for(const absolute of walk(DIST).filter(p=>p.endsWith('.html'))){
  const relative=path.relative(DIST,absolute).replaceAll(path.sep,'/');
  const html=fs.readFileSync(absolute,'utf8');
  if(!html.includes('<header class="site-header">'))continue;
  const navBlocks=[...html.matchAll(/<nav\b[^>]*\bclass="main-nav"[^>]*>[\s\S]*?<\/nav>/g)];
  if(navBlocks.length!==1)fail('global menu count '+navBlocks.length,relative);
  const nav=navBlocks[0][0];
  if(!nav.includes('aria-label="전체 메뉴"'))fail('navigation accessibility label',relative);
  const entries=[...nav.matchAll(/<a href="([^"]+)"( aria-current="page")?>([^<]+)<\/a>/g)];
  if(entries.length!==EXPECTED.length)fail('menu item count '+entries.length,relative);
  entries.forEach(([,href,current,label],i)=>{
    const [wantHref,wantLabel]=EXPECTED[i];
    if(href!==wantHref || label!==wantLabel)fail('menu order/link/label '+i,relative);
    const target=path.join(DIST,href==='/'?'index.html':href.slice(1)+'index.html');
    if(!fs.existsSync(target))fail('broken destination '+href,relative);
    if(current)selected++;
  });
  const pathname=relative==='index.html'?'/':('/'+relative.replace(/index\.html$/,''));
  let want=-1;
  if(pathname==='/')want=0;
  else if(pathname.startsWith('/today/'))want=1;
  else if(pathname.startsWith('/finance/'))want=2;
  else if(pathname.startsWith('/topics/')||pathname.startsWith('/car/')||
          pathname.startsWith('/tools/car-cost/')||
          pathname.startsWith('/support/'))want=3;
  const currentIndices=entries.flatMap((entry,i)=>entry[2]?[i]:[]);
  if(currentIndices.length!==(want<0?0:1) || (want>=0&&currentIndices[0]!==want))
    fail('active section selection',relative);
  const normalized=nav.replace(/ aria-current="page"/g,'');
  if(baseline===null)baseline=normalized;
  else if(baseline!==normalized)fail('menu differs between page templates',relative);
  if((html.match(/href="\/life-global-nav\.css"/g)||[]).length!==1)
    fail('navigation style should be loaded once',relative);
  if((html.match(/<link rel="canonical"/g)||[]).length!==1)
    fail('canonical changed',relative);
  if(!html.includes('name="robots"'))fail('robots missing',relative);
  checked++;
}
if(checked<140)fail('not enough tested pages: '+checked,'dist');
const css=read('life-global-nav.css');
for(const marker of ['grid-template-columns:repeat(4,minmax(0,1fr))','@media(max-width:760px)','a[aria-current="page"]','overflow:visible']){
  if(!css.includes(marker))fail('missing responsive navigation style '+marker,'css');
}
for(const p of ['index.html','today/index.html','finance/index.html','finance/savings/index.html',
  'finance/markets/index.html','finance/loan-payment/index.html',
  'car/index.html','support/index.html','topics/index.html',
  'tools/car-cost/index.html','finance/mortgage-calculator/index.html',
  'finance/savings-calculator/index.html','about/index.html','search/index.html']){
  if(!read(p).includes('aria-label="전체 메뉴"'))fail('global header lost',p);
}

const topics=read('topics/index.html');
if(!topics.includes('<h1>생활정보</h1>') ||
   !topics.includes('href="/car/"') ||
   !topics.includes('href="/support/"') ||
   !topics.includes('href="/support/housing-benefit-2026/"')) {
  fail('Lifestyle landing page is missing the real categories','topics/index.html');
}
const finance=read('finance/index.html');
for(const target of ['/finance/savings/','/finance/markets/','/finance/loan-payment/']) {
  if(!finance.includes('href="'+target+'"'))
    fail('Grouped financial destination missing '+target,'finance/index.html');
}
if(!read('sitemap.xml').includes('<loc>https://pagero.kr/life/topics/</loc>')) {
  fail('Topics missing from sitemap','sitemap.xml');
}
if(!JSON.parse(read('search-index.json')).some(e=>e.url==='/topics/')) {
  fail('Topics missing from local search index','search-index.json');
}
console.log('[nav-qa] '+checked+' HTML documents share an identical four-link menu, correct active state, one stylesheet and working links.');
