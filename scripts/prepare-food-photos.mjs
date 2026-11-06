import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Copy freely licensed photos into the Pages static bundle. Limit concurrent
// Commons requests to avoid CDN HTTP 429 and retry using alternative sizes.
const DIST=path.resolve('dist');
const DATA=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const folder=path.join(DIST,'food-images');
fs.mkdirSync(folder,{recursive:true});

const commonsUrl=(filename,size=960)=>{
  const name=filename.replaceAll(' ','_');
  const hash=createHash('md5').update(name).digest('hex');
  const encoded=encodeURIComponent(name);
  const base='https://upload.wikimedia.org/wikipedia/commons/';
  const prefix=hash[0]+'/'+hash.slice(0,2)+'/'+encoded;
  return size?base+'thumb/'+prefix+'/'+size+'px-'+encoded:base+prefix;
};
const manifests={};
const tasks=DATA.guides.flatMap(guide=>
  guide.visuals.map((photo,i)=>({guide,photo,name:guide.slug+'-'+(i===0?'hero':'detail')+'.jpg'})));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const verifiedImage=async url=>{
  if(!['upload.wikimedia.org','images.pexels.com'].includes(new URL(url).hostname))
    throw Error('unexpected image host');
  const response=await fetch(url,{
    headers:{Accept:'image/jpeg','User-Agent':'LifePageroFoodGuide/1.0 (editorial image attribution retained)'},
    signal:AbortSignal.timeout(6500)
  });
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  if(!type.includes('image/jpeg'))throw Error('not JPEG: '+type);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length<8000||data.length>4_000_000||data[0]!==0xff||data[1]!==0xd8)
    throw Error('invalid JPEG/size');
  return data;
};
const processPhoto=async ({guide,photo,name})=>{
  const target=path.join(folder,name);
  const urls=photo.downloadUrl?[photo.downloadUrl]:
    [commonsUrl(photo.filename,960),commonsUrl(photo.filename,800),commonsUrl(photo.filename,0)];
  let failure='unavailable';
  for(let i=0;i<urls.length;i++){
    try{
      const bytes=await verifiedImage(urls[i]);
      fs.writeFileSync(target,bytes);
      manifests[photo.filename]='/food-images/'+name;
      console.log('[food-photo] '+guide.slug+' '+photo.placement+
        ' local '+bytes.length+' bytes (attempt '+(i+1)+')');
      return;
    }catch(error){
      failure=String(error?.message||error);
      // Different thumbnail widths/originals avoid a hot CDN cache path;
      // spacing requests also prevents simultaneous Wikimedia throttling.
      if(i<urls.length-1)await delay(failure.includes('429')?1300:350);
    }
  }
  manifests[photo.filename]=urls[0];
  console.warn('[food-photo] fallback URL for '+guide.slug+' '+photo.filename+
    ' ('+failure.slice(0,70)+')');
};
let cursor=0;
async function worker(){
  while(cursor<tasks.length){
    const task=tasks[cursor++];
    await processPhoto(task);
  }
}
await Promise.all([worker(),worker()]);
fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifests,null,2));
console.log('[food-photo] '+Object.values(manifests).filter(u=>u.startsWith('/')).length+
  '/'+tasks.length+' images deployed as local static assets');
