import fs from 'node:fs';
import path from 'node:path';
import {relatedGuides} from './related-guides.mjs';

const root=path.resolve('content/posts');
const dist=path.resolve('dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name);
  return entry.isDirectory()?walk(file):[file];
});
const posts=walk(root).filter(file=>file.endsWith('.json'))
  .map(file=>JSON.parse(fs.readFileSync(file,'utf8')))
  .filter(post=>!post.noindex);
const fail=(message)=>{throw new Error('[related-qa] '+message);};
let checked=0, topicalLinks=0, categoryFallbacks=0;
for(const post of posts){
  const href='/'+post.category+'/'+post.slug+'/';
  const file=path.join(dist,post.category,post.slug,'index.html');
  if(!fs.existsSync(file))fail('Missing canonical article '+href);
  const html=fs.readFileSync(file,'utf8');
  const aside=html.match(/<aside class="sidebar"><section class="sidebar-card"><h2>관련 생활정보<\/h2><ul class="sidebar-list">([\s\S]*?)<\/ul>/)?.[1];
  if(aside===undefined)fail('Missing on-page related links '+href);
  const rendered=[...aside.matchAll(/<li><a href="([^"]+)">/g)].map(match=>match[1]);
  const expected=relatedGuides(post,posts,4).map(item=>
    '/'+item.category+'/'+item.slug+'/');
  if(expected.length===0)expected.push('/'+post.category+'/');
  if(rendered.length!==expected.length || rendered.some((url,i)=>url!==expected[i]))
    fail('Unrelated or missing link '+href+': '+JSON.stringify({expected,rendered}));
  if(rendered.includes(href))fail('Self-link in related guides '+href);
  if(new Set(rendered).size!==rendered.length)fail('Duplicate links in '+href);
  const meta='<time datetime="'+post.reviewedAt+'">내용 검토 ';
  if(!html.includes(meta))fail('Missing honest editorial review date '+href);
  for(const url of rendered){
    const relative=url.replace(/^\/+/,'');
    if(!fs.existsSync(path.join(dist,relative,'index.html')))
      fail('Related destination not deployed '+url+' from '+href);
  }
  topicalLinks+=rendered.length-(expected[0]==='/'+post.category+'/'?1:0);
  categoryFallbacks+=expected[0]==='/'+post.category+'/'?1:0;
  checked++;
}
if(checked<40)fail('Unexpected article coverage '+checked);
console.log('[related-qa] verified '+checked+' canonical articles, '+topicalLinks+
  ' topical links, '+categoryFallbacks+' honest category fallbacks and all editorial review dates.');
