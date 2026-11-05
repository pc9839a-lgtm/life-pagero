import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve('content'),DIST=path.resolve('dist');
const modules={
  ...JSON.parse(fs.readFileSync(path.join(ROOT,'editorial-verified-calculations-a.json'),'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(ROOT,'editorial-verified-calculations-b.json'),'utf8'))
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const publishWording=s=>String(s).replace(/정리합니다/g,'수록했습니다').replace(/안내합니다/g,'명시합니다').replace(/확인하세요/g,'확인해야 합니다').replace(/참고하세요/g,'참고할 수 있습니다').replace(/살펴보세요/g,'살펴볼 수 있습니다').replace(/읽어보세요/g,'읽을 수 있습니다');
let checked=0,tableCount=0;
for(const [slug,parts] of Object.entries(modules)){
  const dir=slug.startsWith('car-')?'car':'support';
  const mainFile=path.join(DIST,dir,slug,'index.html');
  const main=fs.readFileSync(mainFile,'utf8');
  const headings=new Set();
  if(!main.includes('<meta name="robots" content="index,follow'))throw Error('Indexable page absent: '+slug);
  for(const [idx,m] of parts.entries()){
    if(headings.has(m.title))throw Error('Repeated module heading '+slug);
    headings.add(m.title);
    // Article subheadings are intentionally omitted; verify paragraphs and tables.
    if(!main.includes(esc(publishWording(m.note)))||!main.includes(esc(publishWording(m.lead))))throw Error('Main page missing rich copy: '+slug+' part '+(idx+1));
    for(const row of m.rows){
      if(!row.every(c=>main.includes(esc(c))))throw Error('Missing verified table row: '+slug+' part '+(idx+1));
    }
    const sect=main.split('<!-- life-body-part-'+(idx+1)+' -->')[1]?.split('<!-- life-body-part-'+(idx+2)+' -->')[0]||'';
    if(!sect.includes('article-data-table')||!sect.includes(esc(publishWording(m.note))))throw Error('Module misplaced or table missing: '+slug+' part '+(idx+1));
    if(idx>0){
      const page=fs.readFileSync(path.join(DIST,dir,slug,String(idx+1),'index.html'),'utf8');
      if(!page.includes(esc(publishWording(m.note)))||!page.includes(esc(m.rows[0][0])))throw Error('Continuation page absent: '+slug+' part '+(idx+1));
    }
    checked++;tableCount++;
  }
}
if(checked!==24||tableCount!==24)throw Error('Unexpected rich guide count');
console.log('[rich-guides] Verified '+Object.keys(modules).length+' priority articles with '+tableCount+' bespoke tables, calculations and application workflows in canonical/continuation HTML.');
