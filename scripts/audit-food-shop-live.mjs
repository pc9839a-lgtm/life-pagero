import {spawnSync} from 'node:child_process';
import {isRelevantFoodProduct} from '../functions/deals/api.js';

// Live diagnostics must cover every published /food/ article, not only the
// first two. Run manually when needed; production requests must not be
// generated automatically by every unrelated pull request.
const catalog=[
  ['scallops-clean-steam-storage','가리비','가리비'],
  ['sweet-potato-storage-guide','고구마','고구마'],
  ['samchi-grill-clean-freeze','삼치','삼치'],
  ['autumn-radish-storage-beef-soup','가을무','무'],
  ['oyster-clean-cook-storage','생굴','굴'],
  ['sweet-persimmon-storage-salad','단감','단감']
];
const base='https://pagero.kr/life';
for(const [slug,query,topic] of catalog){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  const url=base+'/deals/api?'+new URLSearchParams({mode:'search',q:query,src:'food'});
  try{
    const start=Date.now();
    const response=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
    let data;
    try{data=await response.json()}catch{data=null}
    const items=Array.isArray(data?.items)?data.items:[];
    const mismatched=items.filter(x=>!isRelevantFoodProduct(topic,x.title||''));
    console.log('[food-shop-live]',JSON.stringify({
      slug,query,http:response.status,ms:Date.now()-start,status:data?.status||'invalid-response',
      itemCount:items.length,rejected: mismatched.map(x=>String(x.title).slice(0,80)).slice(0,4),
      examples:items.map(x=>String(x.title).slice(0,66)).slice(0,3)
    }));
  }catch(error){
    console.warn('[food-shop-live]',JSON.stringify({slug,query,error:String(error?.message||error)}));
  }finally{clearTimeout(timer)}
}
for(const [slug] of catalog){
  const url=base+'/food/'+slug+'/';
  const chrome=spawnSync('google-chrome',[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--virtual-time-budget=9000','--dump-dom',url
  ],{encoding:'utf8',timeout:18000,maxBuffer:12*1024*1024});
  const dom=chrome.stdout||'';
  const shopStatus=dom.match(/class="food-shop-status"[^>]*>([^<]*)<\/p>/)?.[1]||'not-found';
  const cards=(dom.match(/class="food-shop-product(?: food-shop-product-first)?"/g)||[]).length;
  const sectionIndex=dom.indexOf('id="food-shopping"');
  const photoPaths=(dom.match(/src="\/life\/food-images\/[^"]+"/g)||[]).length;
  console.log('[food-browser]',JSON.stringify({
    slug,exit:chrome.status,hasShopSection:sectionIndex!==-1,cards,
    shopStatus:shopStatus.slice(0,80),localPhotoPaths:photoPaths,
    scriptVersioned:/food-guide-products\.js\?v=[a-f0-9]{12}/.test(dom)
  }));
}
