(()=>{
"use strict";
// Live ADPICK data only. Keep provider product and price values untouched
// server-side; format KRW for readability in the browser.
const host=document.querySelector("[data-food-guide-products]");
if(!host)return;
const results=host.querySelector("[data-food-shop-results]");
const status=host.querySelector("[data-food-shop-status]");
const retry=host.querySelector("[data-food-shop-retry]");
const query=String(host.dataset.foodGuideProducts||"").trim();
if(!results||!status||query.length<2||query.length>40)return;
const prefix=location.pathname.startsWith("/life/")?"/life/":"/";
// Use the keywords confirmed to return ingredient results in live ADPICK.
const preciseSearch=Object.freeze({"가리비":"홍가리비","고구마":"고구마"});
const searchQuery=preciseSearch[query]||query;
const make=(tag,cls,value)=>{
  const element=document.createElement(tag);
  if(cls)element.className=cls;
  if(value!=null)element.textContent=String(value);
  return element;
};
const https=value=>{
  try{const url=new URL(String(value||""));return url.protocol==="https:"?url.href:null;}
  catch{return null;}
};
const formatPrice=raw=>{
  if(raw==null||String(raw).trim()==="")return "가격 확인";
  if(typeof raw==="number"){
    return Number.isFinite(raw)&&raw>=0
      ?Math.round(raw).toLocaleString("ko-KR")+"원"
      :"가격 확인";
  }
  const original=String(raw).trim();
  const cleaned=original.replace(/[,\s]/g,"").replace(/^[₩￦]/,"").replace(/원$/,"");
  if(/^\d+(?:\.\d+)?$/.test(cleaned)){
    const value=Number(cleaned);
    if(Number.isFinite(value)&&value>=0)
      return Math.round(value).toLocaleString("ko-KR")+"원";
  }
  // Do not infer a missing price or change provider's non-numeric description.
  return original;
};
function productImage(src){
  const frame=make("div","food-shop-image");
  const fallback=()=>frame.replaceChildren(
    make("span","food-shop-photo-missing","상품 이미지 없음")
  );
  const photo=https(src);
  if(!photo){fallback();return frame;}
  const img=make("img");
  img.alt="";
  img.loading="lazy";
  img.decoding="async";
  // Some retailer CDNs block no-referrer image requests. Let the browser use
  // its default cross-origin referrer behavior and provide an error fallback.
  img.addEventListener("error",fallback,{once:true});
  img.src=photo;
  frame.append(img);
  return frame;
}
function appendProduct(item,index){
  if(!item||typeof item.title!=="string"||!item.title.trim())return false;
  const affiliate=https(item.commissionlink);
  if(!affiliate)return false;
  const card=make("a","food-shop-product"+(index===0?" food-shop-product-first":""));
  card.href=affiliate;
  card.target="_blank";
  card.rel="sponsored noopener noreferrer";
  card.setAttribute("aria-label",item.title+" 상품 확인");
  const picture=productImage(item.photo);
  const info=make("div","food-shop-product-info");
  info.append(make("span","food-shop-merchant",item.cp_name||"판매처"));
  info.append(make("strong","food-shop-name",item.title));
  const bottom=make("div","food-shop-product-bottom");
  const price=make("div","food-shop-price-row");
  price.append(make("span","food-shop-price-label","판매가"));
  price.append(make("strong","food-shop-price",formatPrice(item.price)));
  bottom.append(price);
  bottom.append(make("span","food-shop-buy","구매하기"));
  info.append(bottom);
  card.append(picture,info);
  results.append(card);
  return true;
}
let inFlight=false;
let hasAutoRequested=false;
async function load(){
  // Coalesce concurrent viewport events and repeated manual clicks.
  if(inFlight)return;
  inFlight=true;
  hasAutoRequested=true;
  status.textContent="상품 조회 중";
  if(retry)retry.hidden=true;
  results.replaceChildren();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  try{
    const params=new URLSearchParams({mode:"search",q:searchQuery,src:"food"});
    const response=await fetch(prefix+"deals/api?"+params.toString(),{
      headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal
    });
    if(!response.ok)throw Error("HTTP_"+response.status);
    const json=await response.json();
    if(json?.status!=="ok"||!Array.isArray(json.items))throw Error("INVALID_RESPONSE");
    let count=0;
    for(const item of json.items){
      if(count>=4)break;
      if(appendProduct(item,count))count++;
    }
    status.textContent=count?count+"개 상품":"현재 등록된 식재료 상품이 없습니다.";
    if(!count&&retry)retry.hidden=false;
  }catch{
    status.textContent="상품 조회에 실패했습니다.";
    if(retry)retry.hidden=false;
  }finally{
    clearTimeout(timer);
    inFlight=false;
  }
}
if(retry)retry.addEventListener("click",load);
// Never spend a Cloudflare Functions invocation on article entry alone.
// Product data is requested only when the actual shopping panel is in view.
status.textContent="관련 상품 영역에 도착하면 상품을 불러옵니다.";
let pendingWhileHidden=false;
const loadWhenVisible=()=>{
  if(hasAutoRequested)return;
  if(document.visibilityState==="hidden"){
    pendingWhileHidden=true;
    return;
  }
  hasAutoRequested=true;
  load();
};
if(typeof IntersectionObserver==="function"){
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=0.15)){
      observer.disconnect();
      loadWhenVisible();
    }
  },{root:null,rootMargin:"0px",threshold:0.15});
  observer.observe(host);
}else if(retry){
  // Older browsers without IntersectionObserver retain intentional access.
  status.textContent="상품을 보려면 불러오기 버튼을 눌러주세요.";
  retry.textContent="상품 불러오기";
  retry.hidden=false;
}
if(document.addEventListener){
  document.addEventListener("visibilitychange",()=>{
    if(pendingWhileHidden&&document.visibilityState!=="hidden"){
      pendingWhileHidden=false;
      loadWhenVisible();
    }
  });
}
})();