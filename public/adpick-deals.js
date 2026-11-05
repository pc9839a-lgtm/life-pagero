(()=>{"use strict";
const target=document.querySelector("[data-deals-list]");
const status=document.querySelector("[data-deals-status]");
const filters=document.querySelector("[data-deals-filters]");
const sort=document.querySelector("[data-deals-sort]");
const refreshed=document.querySelector("[data-deals-updated]");
if(!target||!status||!filters||!sort)return;
const rules=[["식품",/식품|과자|라면|쌀|커피|음료|고기|과일|우유|치즈|견과|간식/],
["생활용품",/세제|휴지|물티슈|주방|청소|수건|샴푸|치약|생활용품/],
["디지털",/노트북|태블릿|스마트폰|충전기|모니터|이어폰|키보드|마우스|SSD|컴퓨터/],
["가전",/냉장고|세탁기|건조기|에어컨|청소기|선풍기|공기청정기|전자레인지|밥솥/],
["패션·뷰티",/의류|운동화|신발|가방|화장품|선크림|향수|셔츠|바지/]];
const cat=name=>rules.find(p=>p[1].test(name))?.[0]||"기타";
const el=(tag,css,value)=>{const n=document.createElement(tag);if(css)n.className=css;if(value!=null)n.textContent=String(value);return n;};
const won=n=>Number(n).toLocaleString("ko-KR")+"원";
const url=v=>{try{const u=new URL(String(v||""));return u.protocol==="https:"?u.href:null;}catch{return null;}};
let items=[],selected="전체";
function render(){
 const rows=items.filter(p=>selected==="전체"||p.category===selected);
 if(sort.value==="discount")rows.sort((a,b)=>(b.discountPercent||0)-(a.discountPercent||0));
 if(sort.value==="low")rows.sort((a,b)=>a.price-b.price);
 target.replaceChildren();
 for(const p of rows){
  const href=url(p.buyurl);if(!href)continue;
  const a=el("a","adpick-card");a.href=href;a.target="_blank";a.rel="sponsored noopener noreferrer";
  const image=el("div","adpick-card-photo"),src=url(p.photo);
  if(src){const img=el("img");img.src=src;img.alt="";img.loading="lazy";img.decoding="async";image.append(img);}
  else image.append(el("span","adpick-photo-empty","이미지 없음"));
  if(p.discountPercent)image.append(el("span","adpick-rate",p.discountPercent+"% 할인"));
  const detail=el("div","adpick-card-info");
  detail.append(el("span","adpick-mall",p.mall||"쇼핑몰"),el("strong","adpick-product-name",p.name));
  const price=el("div","adpick-price");price.append(el("strong","",won(p.price)));
  if(p.originalPrice)price.append(el("del","",won(p.originalPrice)));
  detail.append(price,el("span","adpick-cta","판매처에서 확인"));a.append(image,detail);target.append(a);
 }
 status.textContent=rows.length?rows.length+"개 상품":"조건에 맞는 상품이 없습니다.";
}
function buttons(){
 filters.replaceChildren();
 for(const name of ["전체",...new Set(items.map(p=>p.category))]){
  const b=el("button","adpick-filter",name);b.type="button";b.setAttribute("aria-pressed",String(selected===name));
  b.addEventListener("click",()=>{selected=name;buttons();render();});filters.append(b);
 }
}
async function init(){
 try{
  const response=await fetch("/deals/api",{headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("HTTP_"+response.status);
  const data=await response.json();
  if(data.status!=="ok"||!Array.isArray(data.items))throw Error("INVALID");
  items=data.items.filter(p=>p&&Number.isFinite(p.price)&&url(p.buyurl)).map(p=>({...p,category:cat(p.name)}));
  if(!items.length)throw Error("EMPTY");
  const date=new Date(data.retrievedAt);
  if(refreshed&&Number.isFinite(date.getTime()))refreshed.textContent="확인 "+new Intl.DateTimeFormat("ko-KR",{
    timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  buttons();render();
 }catch{status.textContent="현재 표시할 수 있는 상품이 없습니다.";target.replaceChildren();}
}
sort.addEventListener("change",render);init();
})();