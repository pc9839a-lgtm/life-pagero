(()=>{
"use strict";
// Food articles only. Product and price values are provided live by the
// existing server-side ADPICK for BIZ endpoint. Never persist response data.
const host=document.querySelector("[data-food-guide-products]");
if(!host)return;
const results=host.querySelector("[data-food-shop-results]");
const status=host.querySelector("[data-food-shop-status]");
const query=String(host.dataset.foodGuideProducts||"").trim();
if(!results||!status||query.length<2||query.length>40)return;
const prefix=location.pathname.startsWith("/life/")?"/life/":"/";
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
function appendProduct(item,index){
  if(!item||typeof item.title!=="string")return false;
  const affiliate=https(item.commissionlink);
  if(!affiliate)return false;
  const card=make("a","food-shop-product"+(index===0?" food-shop-product-first":""));
  card.href=affiliate;
  card.target="_blank";
  card.rel="sponsored noopener noreferrer";
  const picture=make("div","food-shop-image");
  const photo=https(item.photo);
  if(photo){
    const img=make("img");
    img.src=photo;
    img.alt="";
    img.loading="lazy";
    img.decoding="async";
    img.referrerPolicy="no-referrer";
    picture.append(img);
  }else{
    picture.append(make("span","food-shop-photo-missing","상품"));
  }
  const info=make("div","food-shop-product-info");
  info.append(make("span","food-shop-merchant",item.cp_name||"판매처 확인"));
  info.append(make("strong","food-shop-name",item.title));
  const price=item.price==null?"판매처에서 가격 확인"
    :typeof item.price==="number"
      ?item.price.toLocaleString("ko-KR")+"원"
      :String(item.price);
  info.append(make("span","food-shop-price",price));
  info.append(make("span","food-shop-buy","상품 보기"));
  card.append(picture,info);
  results.append(card);
  return true;
}
async function load(){
  status.textContent="관련 상품 확인 중";
  results.replaceChildren();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),11000);
  try{
    const params=new URLSearchParams({mode:"search",q:query,src:"food"});
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
    status.textContent=count?count+"개 상품":"현재 표시할 상품이 없습니다.";
  }catch{
    status.textContent="상품을 불러오지 못했습니다.";
  }finally{
    clearTimeout(timer);
  }
}
load();
})();