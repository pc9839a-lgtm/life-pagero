(()=>{"use strict";
const target=document.querySelector("[data-deals-list]");
const status=document.querySelector("[data-deals-status]");
const tabs=document.querySelector("[data-deals-filters]");
const form=document.querySelector("[data-deals-search]");
const panel=document.querySelector(".adpick-products");
if(!target||!status||!tabs||!form||!panel)return;
const prefix=location.pathname.startsWith("/life/")?"/life/":"/";
const areas=[["today","오늘의 상품"],["popular","인기상품"],["pick","추천상품"]];
const el=(tag,cls,content)=>{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(content!=null)item.textContent=String(content);
  return item;
};
const https=value=>{
  try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:null;}
  catch{return null;}
};
const keyOf=params=>params.mode+":"+(params.mode==="best"?params.area:params.q);
let active="today",requestId=0,activeController=null;
let queuedTimer=null,queuedKey=null,loadingKey=null,lastSuccessfulKey=null;
let initialTriggered=false,observedWhileHidden=false;
const srcFood=new URLSearchParams(location.search).get("src")==="food";
function selectButtons(){
  tabs.replaceChildren();
  for(const [area,label] of areas){
    const button=el("button","adpick-filter",label);
    button.type="button";
    button.setAttribute("aria-pressed",String(area===active));
    button.addEventListener("click",()=>{
      const key=keyOf({mode:"best",area});
      if(area===active&&(loadingKey===key||queuedKey===key||lastSuccessfulKey===key))
        return;
      active=area;
      selectButtons();
      form.reset();
      enqueue({mode:"best",area});
    });
    tabs.append(button);
  }
}
function showEmpty(message,params){
  target.replaceChildren();
  const box=el("div","adpick-empty");
  box.append(el("p","",message));
  const retry=el("button","","다시 조회");
  retry.type="button";
  retry.addEventListener("click",()=>load(params,true));
  box.append(retry);
  target.append(box);
}
function render(items,params){
  target.replaceChildren();
  for(const p of items){
    if(!p||!https(p.commissionlink))continue;
    const featured=target.childElementCount===0;
    const a=el("a",featured?"adpick-card adpick-card--featured":"adpick-card");
    a.href=p.commissionlink;
    a.target="_blank";a.rel="sponsored noopener noreferrer";
    const image=el("div","adpick-card-photo");
    const src=https(p.photo);
    if(src){
      const img=el("img");
      img.src=src;img.alt="";img.loading="lazy";img.decoding="async";
      image.append(img);
    }else image.append(el("span","adpick-photo-empty","상품 이미지 없음"));
    const detail=el("div","adpick-card-info");
    detail.append(el("span","adpick-mall",p.cp_name||"제휴 쇼핑몰"),
      el("strong","adpick-product-name",p.title));
    const price=el("div","adpick-price");
    price.append(el("strong","",p.price==null?"판매처에서 가격 확인":
      (typeof p.price==="number"?p.price.toLocaleString("ko-KR")+"원":p.price)));
    detail.append(price,el("span","adpick-cta","상품 보기"));
    a.append(image,detail);
    target.append(a);
  }
  if(!target.childElementCount){
    status.textContent="검색 결과 0개";
    showEmpty("표시할 상품이 없습니다.",params);
  }else status.textContent=target.childElementCount+"개 상품";
}
function cancelPending(){
  if(queuedTimer!==null){clearTimeout(queuedTimer);queuedTimer=null;}
  queuedKey=null;
  // Aborting a stale browser response does not refund an already invoked
  // Function, but prevents applying stale products and wasting bandwidth.
  if(activeController)activeController.abort();
}
async function load(params,force=false){
  const key=keyOf(params);
  if(!force&&loadingKey===key)return;
  initialTriggered=true;
  cancelPending();
  const id=++requestId;
  const controller=new AbortController();
  activeController=controller;
  loadingKey=key;
  status.textContent="상품을 조회하고 있습니다.";
  target.replaceChildren();
  const query=new URLSearchParams(params);
  if(params.mode==="search"&&srcFood)query.set("src","food");
  const abortTimer=setTimeout(()=>controller.abort(),9500);
  try{
    const response=await fetch(prefix+"deals/api?"+query,{
      headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal
    });
    if(!response.ok)throw Error("HTTP_"+response.status);
    const data=await response.json();
    if(id!==requestId)return;
    if(data.status!=="ok"||!Array.isArray(data.items))throw Error("INVALID_RESPONSE");
    lastSuccessfulKey=key;
    render(data.items,params);
  }catch{
    if(id!==requestId)return;
    lastSuccessfulKey=null;
    status.textContent="조회 실패";
    showEmpty("상품 정보를 불러오지 못했습니다.",params);
  }finally{
    clearTimeout(abortTimer);
    if(id===requestId){activeController=null;loadingKey=null;}
  }
}
function enqueue(params){
  const key=keyOf(params);
  if(queuedKey===key||loadingKey===key)return;
  initialTriggered=true;
  cancelPending();
  // Quick switching between categories invokes only the final selection.
  requestId++;
  queuedKey=key;
  status.textContent="선택한 상품을 준비하고 있습니다.";
  queuedTimer=setTimeout(()=>{
    queuedTimer=null;queuedKey=null;
    load(params);
  },180);
}
form.addEventListener("submit",event=>{
  event.preventDefault();
  const q=String(form.elements.q.value||"").trim();
  if(q.length<2||q.length>40)return;
  active="";
  selectButtons();
  load({mode:"search",q});
});
const initialQuery=new URLSearchParams(location.search).get("q");
const initial=initialQuery&&initialQuery.trim().length>=2&&initialQuery.trim().length<=40
  ?{mode:"search",q:initialQuery.trim()}:{mode:"best",area:"today"};
if(initial.mode==="search"){
  form.elements.q.value=initial.q;
  active="";
}
selectButtons();
status.textContent="상품 영역이 보이면 상품을 불러옵니다.";
const onVisible=()=>{
  if(initialTriggered)return;
  if(document.visibilityState==="hidden"){observedWhileHidden=true;return;}
  initialTriggered=true;
  load(initial);
};
if(typeof IntersectionObserver==="function"){
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=0.15)){
      observer.disconnect();
      onVisible();
    }
  },{root:null,rootMargin:"0px",threshold:0.15});
  observer.observe(panel);
}else{
  const button=el("button","adpick-initial-load","상품 불러오기");
  button.type="button";
  button.addEventListener("click",onVisible);
  target.append(button);
}
document.addEventListener?.("visibilitychange",()=>{
  if(observedWhileHidden&&document.visibilityState!=="hidden"){
    observedWhileHidden=false;
    onVisible();
  }
});
})();