import fs from 'node:fs';
import path from 'node:path';

const CONTENT=path.resolve('content/posts');
const DIST=path.resolve('dist');
const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
  const file=path.join(dir,ent.name);
  return ent.isDirectory()?walk(file):[file];
});
const count=(text,pattern)=>[...text.matchAll(pattern)].length;
const fail=message=>{throw Error('[search-page-qa] '+message);};
const titles=new Map(),descriptions=new Map();
let checked=0,anchors=0;
for(const file of walk(CONTENT).filter(name=>name.endsWith('.json'))){
  const post=JSON.parse(fs.readFileSync(file,'utf8'));
  if(post.noindex)continue;
  const pathname='/'+post.category+'/'+post.slug+'/';
  const filename=path.join(DIST,post.category,post.slug,'index.html');
  if(!fs.existsSync(filename))fail('Missing canonical guide '+pathname);
  const html=fs.readFileSync(filename,'utf8');
  const title=esc(post.title)+' | 생활비서';
  const description=esc(post.description);
  const canonical='https://pagero.kr/life'+pathname;
  for(const [name,fragment] of [
    ['page title','<title>'+title+'</title>'],
    ['search description','<meta name="description" content="'+description+'">'],
    ['social title','<meta property="og:title" content="'+title+'">'],
    ['social description','<meta property="og:description" content="'+description+'">'],
    ['canonical','<link rel="canonical" href="'+canonical+'">'],
    ['heading','<h1>'+esc(post.title)+'</h1>'],
  ])if(!html.includes(fragment))fail('Wrong '+name+' '+pathname);
  if(count(html,/<meta name="description"/g)!==1
    ||count(html,/<title>/g)!==1
    ||count(html,/<link rel="canonical"/g)!==1)fail('Duplicate SEO tags '+pathname);
  if(!html.includes('<meta name="robots" content="index,follow'))
    fail('Canonical article not indexable '+pathname);
  if(titles.has(title))fail('Duplicated title: '+pathname+' and '+titles.get(title));
  if(descriptions.has(description))fail('Duplicated snippet: '+pathname+' and '+descriptions.get(description));
  titles.set(title,pathname);
  descriptions.set(description,pathname);
  const nav=html.match(/<nav class="life-guide-jumps" aria-label="본문 목차">([\s\S]*?)<\/nav>/);
  if(!nav)fail('Missing on-page section navigation '+pathname);
  if(count(nav[1],/<a href="#life-guide-part-[1-3]"/g)!==3)
    fail('Missing section jump '+pathname);
  if(count(html,/<link rel="stylesheet" href="\/life-guide-jumps\.css">/g)!==1)
    fail('Duplicate or missing lightweight navigation style '+pathname);
  for(const [index,part] of post.series.parts.entries()){
    const n=index+1;
    if(!nav[1].includes('href="#life-guide-part-'+n+'" data-compact-open="true">'+esc(part.title)+'</a>'))
      fail('Section label not grounded in article '+pathname+' '+n);
    if(count(html,new RegExp('id="life-guide-part-'+n+'"','g'))!==1)
      fail('Section anchor not unique '+pathname+' '+n);
    const anchor=html.indexOf('id="life-guide-part-'+n+'"');
    const marker=html.indexOf('<!-- life-body-part-'+n+' -->');
    if(marker<0||anchor<marker||anchor-marker>135)
      fail('Section marker and anchor separated '+pathname+' '+n);
    anchors++;
  }
  if(!html.includes('<details id="compact-full-guide" class="compact-full-guide" open>'))
    fail('Original article collapsed '+pathname);
  checked++;
}
if(checked<40)fail('Published article coverage reduced: '+checked);
const style=path.join(DIST,'life-guide-jumps.css');
if(!fs.existsSync(style))fail('Jump navigation stylesheet absent');
console.log('[search-page-qa] '+checked+' canonical articles; all unique accurate title/description/H1/OG; '
  +anchors+' grounded section links; zero duplicate metadata or missing anchors.');
