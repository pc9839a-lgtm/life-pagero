import fs from 'node:fs';
import path from 'node:path';
import {publishedGuideCount,requiredScenarioCount} from './published-guide-count.mjs';

const root=path.resolve('content');
const dist=path.resolve('dist');
const data={...JSON.parse(fs.readFileSync(path.join(root,'editorial-expansions-car.json'),'utf8')),
...JSON.parse(fs.readFileSync(path.join(root,'editorial-expansions-support.json'),'utf8'))};
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const full=path.join(dir,e.name);return e.isDirectory()?walk(full):[full];
});
const files=walk(path.join(root,'posts')).filter(f=>f.endsWith('.json'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const used=new Set();
let count=0,minLength=Infinity,totalLength=0,continuations=0;
const lengths=[];
for(const file of files) {
 const p=JSON.parse(fs.readFileSync(file,'utf8'));
 if(p.noindex)continue;
 const entries=data[p.slug];
 if(!Array.isArray(entries)||entries.length!==3)throw Error('Missing expansion for '+p.slug);
 const base=path.join(dist,p.category,p.slug,'index.html');
 const html=fs.readFileSync(base,'utf8');
 for(const [index,[heading,paragraph]] of entries.entries()) {
   if(used.has(paragraph))throw Error('Same practical content repeated in distinct articles: '+p.slug);
   used.add(paragraph);
   if(!html.includes(esc(paragraph))) {
     throw Error('Expanded guidance absent from public primary HTML: '+p.slug+' case '+(index+1));
   }
   const continuation=path.join(dist,p.category,p.slug,String(index+1),'index.html');
   if(index>0 && fs.existsSync(continuation)) {
     const extraHtml=fs.readFileSync(continuation,'utf8');
     if(!extraHtml.includes(esc(paragraph))) {
       throw Error('Continued reading page lacks added guidance: '+p.slug+' part '+(index+1));
     }
     continuations++;
   }
 }
 const section=html.match(/<div class="article-content">([\s\S]*?)<div class="disclaimer">/)?.[1]||'';
 if(!section)throw Error('No article main body in '+p.slug);
 const len=section.replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ').trim().length;
 lengths.push({slug:p.slug,bodyCharacters:len});
 totalLength+=len;
 minLength=Math.min(minLength,len);
 count++;
}
if(count!==publishedGuideCount||used.size!==requiredScenarioCount)throw Error('Unexpected coverage: '+count+' posts, '+used.size+' notes');
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/editorial-depth-audit.json',JSON.stringify({articles:count,notes:used.size,continuationCasesChecked:continuations,minVisibleCharacters:minLength,avgVisibleCharacters:Math.round(totalLength/count),shortest:lengths.sort((a,b)=>a.bodyCharacters-b.bodyCharacters).slice(0,10)},null,2)+'\n');
console.log('[editorial-depth] Visible HTML verified on '+count+' articles and '+continuations+' continuation pages; '+used.size+' unique case texts, min visible body '+minLength+' chars, average '+Math.round(totalLength/count)+' chars.');
