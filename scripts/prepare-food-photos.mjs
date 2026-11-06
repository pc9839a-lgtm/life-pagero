import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Every published article image must be locally available at build time.
// An external fallback previously hid HTTP 429 and deployed broken pictures.
const DIST=path.resolve('dist');
const DATA=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const folder=path.join(DIST,'food-images');
fs.mkdirSync(folder,{recursive:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const commonsUrl=(filename,size=960)=>{
  const name=filename.replaceAll(' ','_');
  const hash=createHash('md5').update(name).digest('hex');
  const encoded=encodeURIComponent(name);
  const prefix=hash[0]+'/'+hash.slice(0,2)+'/'+encoded;
  const base='https://upload.wikimedia.org/wikipedia/commons/';
  return size?base+'thumb/'+prefix+'/'+size+'px-'+encoded:base+prefix;
};
const verifiedImage=async url=>{
  if(!['upload.wikimedia.org','images.pexels.com'].includes(new URL(url).hostname))
    throw Error('unexpected image host');
  const response=await fetch(url,{
    headers:{Accept:'image/jpeg','User-Agent':'LifePageroFoodGuide/1.0 (editorial image attribution retained)'},
    signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  if(!type.includes('image/jpeg'))throw Error('not JPEG: '+type);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<8000||bytes.length>4_000_000||bytes[0]!==0xff||bytes[1]!==0xd8)
    throw Error('invalid JPEG/size');
  return bytes;
};
const manifest={};
const failures=[];
const tasks=DATA.guides.flatMap(guide=>guide.visuals.map((photo,i)=>({
  guide,photo,name:guide.slug+'-'+(i===0?'hero':'detail')+'.jpg'
})));
if(tasks.length!==DATA.guides.length*2)throw Error('each guide must provide two image sources');
for(const {guide,photo,name} of tasks){
  const target=path.join(folder,name);
  const urls=photo.downloadUrl?[photo.downloadUrl]:
    [commonsUrl(photo.filename,640),commonsUrl(photo.filename,800),
      commonsUrl(photo.filename,960),commonsUrl(photo.filename,0)];
  let last='unavailable';
  for(let i=0;i<urls.length;i++){
    try{
      const bytes=await verifiedImage(urls[i]);
      fs.writeFileSync(target,bytes);
      manifest[photo.filename]='/food-images/'+name;
      console.log('[food-photo] '+guide.slug+' '+photo.placement+' local '+bytes.length+' bytes');
      last='';
      break;
    }catch(error){
      last=String(error?.message||error);
      if(i<urls.length-1)await delay(last.includes('429')?8000:1600);
    }
  }
  if(last){
    failures.push(guide.slug+' / '+photo.filename+' ('+last+')');
    console.error('[food-photo] FAILED '+guide.slug+' / '+photo.filename+' ('+last+')');
  }
  // Avoid exhausting Wikimedia's shared egress quota.
  await delay(1800);
}
if(failures.length){
  console.error('[food-photo] Cannot publish '+failures.length+'/'+tasks.length+
    ' missing photos. Keeping the previously deployed version intact.');
  throw Error('[food-photo] Missing local source images: '+failures.join('; '));
}
if(Object.keys(manifest).length!==tasks.length)
  throw Error('[food-photo] image manifest contains duplicate filenames');
fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));
console.log('[food-photo] '+tasks.length+'/'+tasks.length+' images ready as local static assets');
