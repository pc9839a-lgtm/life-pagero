// Adpick Shopping Mate hotdeal proxy. Official source: sdk_shopping_hotdeal.php
// Never expose ADPICK_AFFID to browsers and never request upstream per visitor.
const SOURCE="https://adpick.co.kr/apis/sdk_shopping_hotdeal.php";
const KEY="https://life-pagero.pages.dev/_cache/adpick-hotdeal-v1";
const TTL=7200;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":status===200?"public, max-age=120, s-maxage="+TTL:"no-store",
  "X-Content-Type-Options":"nosniff"
}});
const str=(v,n=180)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const money=v=>{
  const s=String(v??"").replace(/[,\s원₩]/g,"");
  return /^\d+(?:\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Math.round(Number(s)):null;
};
const https=v=>{try{const u=new URL(String(v||""));return u.protocol==="https:"?u.href:null;}catch{return null;}};
function products(data){
  const entries=Array.isArray(data?.list)?data.list:Array.isArray(data?.data?.list)?data.data.list:[];
  const seen=new Set();
  return entries.map((item,index)=>{
    const name=str(item?.product_name),buyurl=https(item?.buyurl),price=money(item?.price_sale);
    if(!name||!buyurl||price==null||price<=0)return null;
    const mall=str(item?.mall,80),signature=(mall+"|"+name+"|"+price).toLowerCase();
    if(seen.has(signature))return null;seen.add(signature);
    const previous=money(item?.price_org);
    return {id:"deal-"+index,name,mall,photo:https(item?.photo),buyurl,price,
      originalPrice:previous>price?previous:null,
      discountPercent:previous>price?Math.round((previous-price)/previous*100):null};
  }).filter(Boolean).slice(0,120);
}
export async function onRequestGet(context){
  const id=str(context.env.ADPICK_AFFID,100);
  if(!id)return json({status:"unconfigured",items:[]},503);
  const cache=typeof caches!=="undefined"?caches.default:null;
  const request=new Request(KEY);
  if(cache){const saved=await cache.match(request);if(saved)return saved;}
  try{
    const url=new URL(SOURCE);url.searchParams.set("affid",id);
    const response=await fetch(url.toString(),{headers:{Accept:"application/json"},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error("UPSTREAM_"+response.status);
    const items=products(await response.json());
    if(!items.length)throw Error("NO_VALID_PRODUCTS");
    const out=json({status:"ok",source:"ADPICK 쇼핑메이트",retrievedAt:new Date().toISOString(),items});
    if(cache)context.waitUntil?.(cache.put(request,out.clone()));
    return out;
  }catch(e){
    console.error("Adpick API:",String(e?.message||e));
    return json({status:"unavailable",items:[]},502);
  }
}
