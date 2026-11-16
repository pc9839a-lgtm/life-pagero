import fs from 'node:fs';
import path from 'node:path';

// Builds descriptive in-page navigation from the existing authored 3-part guides.
// No new factual claims, dates or additional crawlable URLs are invented.
const CONTENT=path.resolve('content/posts');
const DIST=path.resolve('dist');
const css='/life-guide-jumps.css';
const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
  const file=path.join(dir,ent.name);
  return ent.isDirectory()?walk(file):[file];
});
let patched=0, anchors=0;
for(const file of walk(CONTENT).filter(name=>name.endsWith('.json'))){
  const post=JSON.parse(fs.readFileSync(file,'utf8'));
  if(post.noindex)continue;
  const parts=post.series?.parts;
  if(!Array.isArray(parts)||parts.length!==3)throw Error('[guide-jumps] Unsupported published guide '+post.slug);
  const target=path.join(DIST,post.category,post.slug,'index.html');
  if(!fs.existsSync(target))throw Error('[guide-jumps] Canonical page absent '+target);
  let html=fs.readFileSync(target,'utf8');
  if(html.includes('class="life-guide-jumps"')||html.includes('href="'+css+'"'))
    throw Error('[guide-jumps] Duplicate pass '+post.slug);
  const answer=html.match(/<section class="compact-answer"[\s\S]*?<\/section>/);
  if(!answer)throw Error("[guide-jumps] Reader first answer absent "+post.slug);
  if(!html.includes('<details id="compact-full-guide" class="compact-full-guide" open>'))
    throw Error('[guide-jumps] Article must remain expanded '+post.slug);
  const links=parts.map((part,index)=>{
    const n=index+1;
    const marker='<!-- life-body-part-'+n+' -->';
    if(html.split(marker).length!==2)
      throw Error('[guide-jumps] Unmatched original section '+post.slug+' / '+n);
    html=html.replace(marker,marker+'<span class="life-guide-anchor" id="life-guide-part-'+n+'" tabindex="-1"></span>');
    return '<a href="#life-guide-part-'+n+'" data-compact-open="true">'+esc(part.title)+'</a>';
  }).join('');
  const nav='<nav class="life-guide-jumps" aria-label="본문 목차">'+links+'</nav>';
  html=html.replace(answer[0],answer[0]+nav);
  if(!html.includes('</head>'))throw Error('[guide-jumps] Head missing '+post.slug);
  html=html.replace('</head>','<link rel="stylesheet" href="'+css+'"></head>');
  fs.writeFileSync(target,html);
  patched++;anchors+=parts.length;
}
if(patched<40)throw Error('[guide-jumps] Canonical coverage shrank: '+patched);
console.log('[guide-jumps] '+patched+' indexable guides, '+anchors+' original-section anchors and no new indexable pages.');
