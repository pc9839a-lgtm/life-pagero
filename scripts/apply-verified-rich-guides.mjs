import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('content');
const CONTENT=path.join(ROOT,'posts');
const modules={
  ...JSON.parse(fs.readFileSync(path.join(ROOT,'editorial-verified-calculations-a.json'),'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(ROOT,'editorial-verified-calculations-b.json'),'utf8'))
};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{
  const f=path.join(d,e.name);
  return e.isDirectory()?walk(f):[f];
});
const table = module => {
  const rows=[module.headers,...module.rows];
  if(module.headers.length!==3||module.rows.length<3||module.rows.some(r=>r.length!==3)){
    throw Error('Invalid table columns in '+module.title);
  }
  if(rows.some(r=>r.some(c=>String(c).includes('|')))) throw Error('Unescaped table delimiter in '+module.title);
  return '| '+module.headers.join(' | ')+' |\n| --- | --- | --- |\n'
    +module.rows.map(r=>'| '+r.join(' | ')+' |').join('\n');
};
const contentOf=m=>
  '## '+m.title+'\n\n'+m.lead+'\n\n'+table(m)+'\n\n'+m.note
  +'\n\n공식 확인: [관련 기관 원문]('+m.source+')';
let touched=0,count=0;
const indexed=new Set();
for(const file of walk(CONTENT).filter(f=>f.endsWith('.json'))){
  const p=JSON.parse(fs.readFileSync(file,'utf8'));
  if(p.noindex||!modules[p.slug])continue;
  if(indexed.has(p.slug))throw Error('Duplicate expanded article: '+p.slug);
  indexed.add(p.slug);
  const m=modules[p.slug];
  if(!Array.isArray(m)||m.length!==3||p.series?.parts?.length!==3)throw Error('Missing 3 rich segments: '+p.slug);
  const titles=new Set();
  let changed=false;
  for(let i=0;i<3;i++){
    const item=m[i];
    if(!item.title||item.lead.length<80||item.note.length<70||titles.has(item.title))throw Error('Thin or duplicate module: '+p.slug+' '+i);
    titles.add(item.title);
    const text=contentOf(item);
    const heading='## '+item.title;
    if(!p.series.parts[i].body.includes(heading)){
      p.series.parts[i].body=p.series.parts[i].body.trimEnd()+'\n\n'+text+'\n';
      changed=true;count++;
    }
    if(!p.body.includes(heading)){
      p.body=p.body.trimEnd()+'\n\n'+text+'\n';
      changed=true;
    }
  }
  if(changed) {fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n');touched++;}
}
if(indexed.size!==8)throw Error('Eight priority articles required, found '+indexed.size);
console.log('[rich-guides] '+indexed.size+' source-backed guide enhancements, '+count+' new worked modules across '+touched+' files.');
