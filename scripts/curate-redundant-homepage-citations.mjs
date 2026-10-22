import fs from 'node:fs';
import path from 'node:path';

// A generic agency homepage is a weaker citation than a specific agency record.
// Remove it ONLY if the same official hostname already has a deep source and
// at least two distinct record-level citations remain. Never introduce links.
const ROOT=path.resolve('content/posts');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p];
});
const official=['gov.kr','go.kr','or.kr','energyv.or.kr','bokjiro.go.kr','car365.go.kr','cyberts.kr','wetax.go.kr','efine.go.kr','moel.go.kr'];
function u(source){try{return new URL(source.url)}catch{return null}}
function officialHost(host){return official.some(d=>host===d||host.endsWith('.'+d))}
let filesChanged=0,homeRemoved=0;
for(const filename of walk(ROOT).filter(x=>x.endsWith('.json'))){
  const doc=JSON.parse(fs.readFileSync(filename,'utf8'));
  const sources=Array.isArray(doc.sources)?doc.sources:[];
  const deep=sources.filter(src=>{const a=u(src);return a&&a.protocol==='https:'&&officialHost(a.hostname)&&((a.pathname&&a.pathname!=='/')||a.search)});
  const deepUrls=new Set(deep.map(x=>x.url));
  if(deepUrls.size<2)continue;
  const kept=sources.filter(source=>{
    const a=u(source);
    if(!a || a.protocol!=='https:' || !officialHost(a.hostname)
      || a.pathname!=='/' || a.search)return true;
    // Do not drop directory citations without a more specific source on that exact agency host.
    return !deep.some(d=>u(d).hostname===a.hostname);
  });
  if(kept.length===sources.length)continue;
  if(kept.length<2)throw Error('Citation cleanup would leave too few sources: '+filename);
  doc.sources=kept;
  fs.writeFileSync(filename,JSON.stringify(doc,null,2)+'\n','utf8');
  homeRemoved+=sources.length-kept.length;
  filesChanged++;
  console.log('CURATED',path.relative(ROOT,filename),sources.length,'->',kept.length,'sources');
}
console.log('CURATED_SUMMARY articles',filesChanged,'redundant homepage citations retired',homeRemoved);
