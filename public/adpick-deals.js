(()=>{"use strict";
const target=document.querySelector("[data-deals-list]");
const status=document.querySelector("[data-deals-status]");
const tabs=document.querySelector("[data-deals-filters]");
const form=document.querySelector("[data-deals-search]");
if(!target||!status||!tabs||!form)return;
const prefix=location.pathname.startsWith("/life/")?"/life/":"/";
const areas=[["today","실시간 베스트"],["popular","인기 판매"],["pick","인기 PICK"],["commission","수익 추천"]];
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
function render(items){
 target.replaceChildren();
 for(const p of items){
  if(!p||!https(p.commissionlink))continue;
  const a=el("a","adpick-card");a.href=p.commissionlink;
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
 status.textContent=target.childElementCount?target.childElementCount+"개 상품":"현재 표시할 수 있는 상품이 없습니다.";
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
  render(data.items);
 }catch{
  if(id!==requestId)return;
  status.textContent="지금은 상품 정보를 표시할 수 없습니다. 잠시 후 다시 확인하세요.";
  target.replaceChildren();
 }
}
form.addEventListener("submit",event=>{
 event.preventDefault();const value=form.elements.q.value.trim();
 if(value.length<2)return;
 active="";selectButtons();load({mode:"search",q:value});
});
selectButtons();load({mode:"best",area:"today"});
})();