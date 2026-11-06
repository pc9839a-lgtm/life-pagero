import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Build-time only: copy freely licensed Wikimedia Commons editorial photos into
// the static Pages deployment. The reader never needs to wait for a third-party
// Wikimedia redirect; 4 sources are fetched concurrently and size-checked.
const DIST=path.resolve('dist');
const DATA=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const folder=path.join(DIST,'food-images');
fs.mkdirSync(folder,{recursive:true});
const directUrl=filename=>{
  const name=filename.replaceAll(' ','_');
  const hash=createHash('md5').update(name).digest('hex');
  const encoded=encodeURIComponent(name);
  return 'https://upload.wikimedia.org/wikipedia/commons/thumb/'
    +hash[0]+'/'+hash.slice(0,2)+'/'+encoded+'/960px-'+encoded;
};
const manifest={};
const tasks=DATA.guides.flatMap(guide=>
  guide.visuals.map((photo,i)=>({guide,photo,name:guide.slug+'-'+(i===0?'hero':'detail')+'.jpg'})));
await Promise.all(tasks.map(async({guide,photo,name})=>{
  const target=path.join(folder,name);
  try{
    const url=directUrl(photo.filename);
    const response=await fetch(url,{
      headers:{Accept:'image/jpeg','User-Agent':'LifePageroFoodGuide/1.0 (source attribution retained)'},
      signal:AbortSignal.timeout(6000)
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('image/jpeg'))throw Error('not JPEG: '+type);
    const data=Buffer.from(await response.arrayBuffer());
    if(data.length<8000||data.length>4_000_000||data[0]!==0xff||data[1]!==0xd8)
      throw Error('invalid JPEG or size');
    fs.writeFileSync(target,data);
    manifest[photo.filename]='/food-images/'+name;
    console.log('[food-photo] '+guide.slug+' '+(photo.placement)+' local '+data.length+' bytes');
  }catch(error){
    console.warn('[food-photo] external Commons image fallback: '+photo.filename+
      ' ('+String(error.message||error).slice(0,90)+')');
    manifest[photo.filename]=directUrl(photo.filename);
  }
}));
fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));
console.log('[food-photo] '+Object.values(manifest).filter(v=>v.startsWith('/')).length+
  '/'+tasks.length+' images deployed as local static assets');
