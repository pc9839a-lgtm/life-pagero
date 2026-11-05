(()=>{"use strict";
const target=document.querySelector("[data-deals-list]");
const status=document.querySelector("[data-deals-status]");
const tabs=document.querySelector("[data-deals-filters]");
const form=document.querySelector("[data-deals-search]");
if(!target||!status||!tabs||!form)return;
const prefix=location.pathname.startsWith("/life/")?"/life/":"/";
const areas=[["today","오늘의 상품"],["popular","인기상품"],["pick","추천상품"]];
const el=(tag,cls,content)=>{const item=document.createElement(tag);if(cls)item.className=cls;if(content!=null)item.textContent=String(content);return item;};
const https=value=>{try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:null;}catch{return null;}};
let active="today",requestId=0;
function selectButtons(){
  tabs.replaceChildren();
  for(const [area,label] of areas){
    const button=el("button","adpick-filter",label);button.type="button";
    button.setAttribute("aria-pressed",String(area===active));
    button.addEventListener("click",()=>{active=area;selectButtons();form.reset();load({mode:"best",area});});
    tabs.append(button);
  }
}
function showEmpty(message,params){
 target.replaceChildren();
 const panel=el("div","adpick-empty");
 panel.append(el("p","",message));
 const retry=el("button","","다시 조회");
 retry.type="button";
 retry.addEventListener("click",()=>load(params));
 panel.append(retry);
 target.append(panel);
}
function render(items,params){
 target.replaceChildren();
 let shown=0;
 for(const p of items){
  if(!p||!https(p.commissionlink))continue;
  const a=el("a",shown===0?"adpick-card adpick-card--featured":"adpick-card");a.href=p.commissionlink;
  shown++;
  a.target="_blank";a.rel="sponsored noopener noreferrer";
  const image=el("div","adpick-card-photo");
  const source=https(p.photo);
  if(source){const img=el("img");img.src=source;img.alt="";img.loading="lazy";img.decoding="async";image.append(img);}
  else image.append(el("span","adpick-photo-empty","상품 이미지 없음"));
  const detail=el("div","adpick-card-info");
  detail.append(el("span","adpick-mall",p.cp_name||"제휴 쇼핑몰"),el("strong","adpick-product-name",p.title));
  const price=el("div","adpick-price");price.append(el("strong","",p.price==null?"판매처에서 가격 확인":(typeof p.price==="number"?p.price.toLocaleString("ko-KR")+"원":p.price)));
  detail.append(price,el("span","adpick-cta","상품 보기"));a.append(image,detail);target.append(a);
 }
 if(!target.childElementCount){
   status.textContent="검색 결과 0개";
   showEmpty("표시할 상품이 없습니다.",params);
   return;
 }
 status.textContent=target.childElementCount+"개 상품";
}
async function load(params){
 const id=++requestId;
 const query=new URLSearchParams(params);
 status.textContent="상품을 조회하고 있습니다.";
 target.replaceChildren();
 try{
  const response=await fetch(prefix+"deals/api?"+query,{headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw Error("HTTP_"+response.status);
  const data=await response.json();
  if(id!==requestId)return;
  if(data.status!=="ok"||!Array.isArray(data.items))throw Error("INVALID_RESPONSE");
  render(data.items,params);
 }catch{
  if(id!==requestId)return;
  status.textContent="조회 실패";
  showEmpty("상품 정보를 불러오지 못했습니다.",params);
 }
}
form.addEventListener("submit",event=>{
 event.preventDefault();const value=form.elements.q.value.trim();
 if(value.length<2)return;
 active="";selectButtons();load({mode:"search",q:value});
});
const initialQuery=new URLSearchParams(location.search).get("q");
 if(initialQuery&&initialQuery.trim().length>=2&&initialQuery.trim().length<=40){
  form.elements.q.value=initialQuery.trim();
  active="";selectButtons();load({mode:"search",q:initialQuery.trim()});
 }else{selectButtons();load({mode:"best",area:"today"});}
})();