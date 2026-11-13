import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Temporary one-off preservation job. Save only the same credited, verified
// original JPEGs used by the published 14 food guides; no AI substitutes.
const guides=JSON.parse(fs.readFileSync('content/food-guides.json','utf8')).guides;
const folder=path.resolve('artifacts/food-images');
fs.mkdirSync(folder,{recursive:true});
const origins=['https://pagero.kr/life','https://life-pagero.pages.dev','https://life.pagero.kr'];
const basename=photo=>photo.filename.replaceAll(' ','_');
const original=photo=>{
  if(photo.downloadUrl)return [photo.downloadUrl];
  const name=basename(photo),hash=createHash('md5').update(name).digest('hex');
  const prefix=hash[0]+'/'+hash.slice(0,2)+'/'+encodeURIComponent(name);
  const base='https://upload.wikimedia.org/wikipedia/commons/';
  return [640,800,960].map(size=>base+'thumb/'+prefix+'/'+size+'px-'+encodeURIComponent(name))
    .concat(base+prefix);
};
async function get(url){
  const host=new URL(url).hostname;
  if(!['pagero.kr','life-pagero.pages.dev','life.pagero.kr',
       'upload.wikimedia.org','images.pexels.com'].includes(host))
    throw Error('source host not allowed: '+host);
  const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(13000),
    headers:{'User-Agent':'LifePageroPhotoPreservation/1.0','Accept':'image/jpeg'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  if(!(response.headers.get('content-type')||'').includes('image/jpeg'))
    throw Error('not JPEG: '+response.headers.get('content-type'));
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<8000||bytes.length>4000000||bytes[0]!==255||bytes[1]!==216)
    throw Error('invalid JPEG');
  return bytes;
}
async function manifest(origin){
  try{
    const response=await fetch(origin+'/food-images/manifest.json',{
      signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
    if(!response.ok)return {};
    const value=await response.json();
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }catch{return {};}
}
const manifests=await Promise.all(origins.map(manifest));
console.log('[photos] source manifest keys:',manifests.map((m,i)=>[origins[i],Object.keys(m).length]));
const tasks=guides.flatMap(g=>g.visuals.map((photo,i)=>({
  slug:g.slug,photo,filename:g.slug+'-'+(i===0?'hero':'detail')+'.jpg'
})));
const successes=[],failures=[];
for(let offset=0;offset<tasks.length;offset+=4){
 await Promise.all(tasks.slice(offset,offset+4).map(async(task)=>{
  const expected='/food-images/'+task.filename;
  const firstParty=origins.flatMap((origin,index)=>
    manifests[index][task.photo.filename]===expected
      ? [origin+expected]:[]);
  const urls=[...firstParty,...original(task.photo)];
  let reason='no source';
  for(const url of urls){
   try{
    const bytes=await get(url);
    fs.writeFileSync(path.join(folder,task.filename),bytes);
    successes.push({filename:task.filename,source:url,bytes:bytes.length,
      originalFilename:task.photo.filename});
    console.log('[photos] OK',task.filename,bytes.length,new URL(url).hostname);
    return;
   }catch(error){reason=String(error.message||error);}
  }
  failures.push({filename:task.filename,reason});
  console.error('[photos] FAILED',task.filename,reason);
 }));
}
fs.writeFileSync(path.join(folder,'sources.json'),JSON.stringify({
  total:tasks.length,ok:successes.length,failed:failures.length,successes,failures
},null,2));
console.log('[photos] COLLECTED',successes.length,'/',tasks.length);
if(failures.length)process.exitCode=1;
