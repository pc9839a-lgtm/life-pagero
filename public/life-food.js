(()=>{
'use strict';
const monthly={
1:[['시금치','시금치나물','냉장 보관','시금치'],['무','소고기뭇국','수분이 빠지지 않게 감싸 보관','국산 무'],['귤','귤 간식','서늘하게 보관하고 상한 과일은 분리','감귤']],
2:[['봄동','봄동 겉절이','씻지 않은 상태로 냉장 보관','봄동'],['시금치','시금치 된장국','냉장 보관','시금치'],['딸기','딸기 요거트','씻지 않고 냉장 보관','딸기']],
3:[['냉이','냉이 된장국','흙을 털고 냉장 보관','냉이'],['달래','달래장','냉장 보관','달래'],['쑥','쑥국','가급적 신선할 때 조리','쑥']],
4:[['두릅','두릅 데침','냉장 보관 후 충분히 익혀 먹기','두릅'],['취나물','취나물 볶음','손질한 뒤 냉장 보관','취나물'],['주꾸미','주꾸미 볶음','냉장 상태로 짧게 보관','주꾸미']],
5:[['오이','오이무침','냉장 보관','오이'],['완두콩','완두콩밥','손질 후 냉장·냉동 보관','완두콩'],['참외','참외 샐러드','냉장 보관','참외']],
6:[['감자','감자조림','서늘하고 어두운 곳에 보관','감자'],['매실','매실청','생매실은 반드시 적절히 가공','매실'],['오이','오이냉국','냉장 보관','오이']],
7:[['옥수수','찐 옥수수','익힌 뒤 빠르게 냉장·냉동 보관','옥수수'],['토마토','토마토 샐러드','숙성 정도에 맞춰 보관','토마토'],['가지','가지볶음','냉장 보관','가지']],
8:[['복숭아','복숭아 간식','후숙 상태를 살피고 익으면 냉장','복숭아'],['포도','포도 간식','씻지 않고 냉장 보관','포도'],['옥수수','옥수수밥','가급적 신선할 때 조리','옥수수']],
9:[['고구마','고구마 구이','서늘하고 통풍되는 곳에 보관','고구마'],['배','배 간식','냉장 보관','신고배'],['버섯','버섯전골','냉장 보관 후 충분히 익혀 먹기','표고버섯']],
10:[['사과','사과 샐러드','냉장 보관','사과'],['단감','단감 샐러드','익으면 냉장 보관','단감'],['가을무','무생채','잎을 떼어 냉장 보관','국산 무']],
11:[['삼치','삼치 소금구이','구입 후 빠르게 조리하거나 냉동','삼치'],['가리비','가리비찜','냉장 후 신속히 충분히 익혀 조리','가리비'],['가을무','소고기뭇국','잎을 떼어 냉장 보관','국산 무'],['배추','배춧국','잘린 면은 감싸 냉장 보관','배추'],['단감','단감 샐러드','익으면 냉장 보관','단감'],['고구마','군고구마','서늘하고 통풍되는 곳에 보관','고구마']],
12:[['굴','굴국','냉장 유통을 확인하고 충분히 익혀 먹기','생굴'],['무','무조림','수분이 빠지지 않게 감싸 보관','국산 무'],['시금치','시금치나물','냉장 보관','시금치'],['귤','귤 간식','서늘하게 보관','감귤']]
};
const recipeRows=[["시금치나물",[["시금치",200,"g"],["다진 마늘",0.5,"작은술"],["참기름",1,"작은술"]],["시금치를 씻어 데친 뒤 물기를 짭니다.","참기름과 마늘로 무칩니다."]],["소고기뭇국",[["무",200,"g"],["소고기 국거리",120,"g"],["물",600,"mL"],["국간장",1,"큰술"]],["무와 소고기를 썰어 냄비에서 볶습니다.","물을 붓고 속까지 충분히 익힌 뒤 국간장으로 간합니다."]],["귤 간식",[["귤",2,"개"]],["귤을 씻고 껍질을 벗깁니다.","한입 크기로 나누어 먹습니다."]],["봄동 겉절이",[["봄동",200,"g"],["고춧가루",1,"큰술"],["액젓",1,"작은술"],["식초",1,"작은술"]],["봄동을 씻고 물기를 털어냅니다.","양념을 섞어 먹기 직전 버무립니다."]],["시금치 된장국",[["시금치",150,"g"],["된장",1,"큰술"],["물",600,"mL"]],["시금치를 씻고 손질합니다.","된장을 푼 끓는 물에 시금치를 넣어 익힙니다."]],["딸기 요거트",[["딸기",150,"g"],["플레인 요거트",200,"g"]],["딸기를 씻고 꼭지를 제거합니다.","썰어 요거트에 올립니다."]],["냉이 된장국",[["냉이",100,"g"],["된장",1,"큰술"],["물",600,"mL"]],["냉이의 뿌리 흙을 꼼꼼히 씻습니다.","된장을 푼 물에 넣어 끓여 익힙니다."]],["달래장",[["달래",80,"g"],["간장",2,"큰술"],["고춧가루",0.5,"큰술"]],["달래를 잘 씻어 송송 썹니다.","간장과 고춧가루를 넣어 섞습니다."]],["쑥국",[["쑥",100,"g"],["된장",1,"큰술"],["물",600,"mL"]],["쑥을 여러 번 씻고 손질합니다.","된장을 푼 끓는 물에 넣어 충분히 익힙니다."]],["두릅 데침",[["두릅",200,"g"],["물",1000,"mL"]],["두릅을 씻고 밑동을 손질합니다.","끓는 물에 충분히 데쳐 익힙니다."]],["취나물 볶음",[["취나물",200,"g"],["들기름",1,"큰술"],["다진 마늘",0.5,"작은술"]],["취나물을 적절히 데쳐 물기를 짭니다.","팬에 기름과 마늘을 넣고 볶습니다."]],["주꾸미 볶음",[["주꾸미",300,"g"],["양파",0.5,"개"],["고추장",1,"큰술"],["간장",1,"큰술"]],["주꾸미를 깨끗이 손질하고 양파를 썹니다.","양념과 함께 볶아 속까지 충분히 익힙니다."]],["오이무침",[["오이",1,"개"],["고춧가루",1,"큰술"],["식초",1,"큰술"]],["오이를 깨끗이 씻어 썹니다.","고춧가루와 식초를 넣어 버무립니다."]],["완두콩밥",[["쌀",1,"컵"],["완두콩",80,"g"]],["쌀을 씻고 완두콩을 손질합니다.","밥솥 물 눈금에 맞춰 밥을 짓습니다."]],["참외 샐러드",[["참외",1,"개"],["잎채소",80,"g"],["올리브유",1,"큰술"]],["참외와 채소를 씻어 썹니다.","접시에 담고 올리브유를 뿌립니다."]],["감자조림",[["감자",250,"g"],["간장",1,"큰술"],["물",150,"mL"]],["감자 껍질을 벗기고 한입 크기로 자릅니다.","간장과 물을 넣고 감자가 부드럽게 익을 때까지 조립니다."]],["매실청",[["시판 매실청",4,"큰술"],["물",400,"mL"]],["식품용으로 가공된 매실청을 준비합니다.","물에 희석해 마시고 생매실은 그대로 먹지 않습니다."]],["오이냉국",[["오이",1,"개"],["물",500,"mL"],["식초",2,"큰술"],["소금",0.5,"작은술"]],["오이를 씻어 가늘게 썹니다.","찬물에 식초와 소금을 섞고 오이를 넣습니다."]],["찐 옥수수",[["옥수수",2,"개"]],["옥수수의 껍질과 수염을 손질합니다.","찜기에 넣고 중심까지 익힙니다."]],["토마토 샐러드",[["토마토",2,"개"],["양파",0.25,"개"],["올리브유",1,"큰술"]],["토마토와 양파를 씻어 썹니다.","올리브유를 넣어 가볍게 섞습니다."]],["가지볶음",[["가지",2,"개"],["간장",1,"큰술"],["식용유",1,"큰술"]],["가지를 씻어 한입 크기로 썹니다.","기름을 두른 팬에서 익히고 간장으로 간합니다."]],["복숭아 간식",[["복숭아",2,"개"]],["복숭아를 깨끗이 씻습니다.","먹기 좋게 잘라 먹습니다."]],["포도 간식",[["포도",200,"g"]],["포도를 흐르는 물에 충분히 씻습니다.","물기를 털고 먹습니다."]],["옥수수밥",[["쌀",1,"컵"],["옥수수 알",100,"g"]],["쌀을 씻고 옥수수 알을 준비합니다.","밥솥 물 눈금에 맞춰 밥을 짓습니다."]],["고구마 구이",[["고구마",2,"개"]],["고구마를 씻고 물기를 닦습니다.","오븐이나 에어프라이어로 속까지 익힙니다."]],["배 간식",[["배",1,"개"]],["배를 씻고 씨를 제거합니다.","먹기 좋게 썰어 먹습니다."]],["버섯전골",[["버섯",200,"g"],["두부",0.5,"모"],["물",600,"mL"],["국간장",1,"큰술"]],["버섯과 두부를 손질합니다.","물과 국간장을 넣고 끓여 모두 익힙니다."]],["사과 샐러드",[["사과",1,"개"],["양상추",100,"g"],["올리브유",1,"큰술"]],["사과와 채소를 깨끗이 씻어 썹니다.","접시에 담고 올리브유를 곁들입니다."]],["단감 샐러드",[["단감",1,"개"],["잎채소",100,"g"],["올리브유",1,"큰술"]],["단감과 채소를 씻어 얇게 썹니다.","올리브유를 곁들여 섞습니다."]],["무생채",[["무",300,"g"],["고춧가루",1,"큰술"],["식초",1,"큰술"]],["무를 깨끗이 씻어 채 썹니다.","양념을 넣고 버무립니다."]],["삼치 소금구이",[["삼치",2,"토막"],["소금",0.5,"작은술"],["식용유",1,"큰술"]],["삼치 물기를 닦고 소금을 가볍게 뿌립니다.","기름 두른 팬에 앞뒤로 구워 속까지 충분히 익힙니다."]],["가리비찜",[["가리비",8,"개"],["물",250,"mL"]],["가리비 껍데기를 씻고 손상된 것은 골라냅니다.","찜기에 담아 속살까지 충분히 익힙니다."]],["배춧국",[["배추",200,"g"],["된장",1,"큰술"],["물",600,"mL"]],["배추를 씻어 먹기 좋게 썹니다.","된장을 푼 물에 넣고 부드럽게 익힙니다."]],["군고구마",[["고구마",2,"개"]],["고구마를 씻고 물기를 제거합니다.","오븐이나 에어프라이어에서 중심까지 익힙니다."]],["굴국",[["굴",200,"g"],["무",100,"g"],["물",600,"mL"],["대파",0.5,"대"]],["굴을 손질하고 무를 썹니다.","무를 끓이다가 굴을 넣고 완전히 익힙니다."]],["무조림",[["무",300,"g"],["간장",1,"큰술"],["물",200,"mL"]],["무를 두껍게 썰어 냄비에 넣습니다.","간장과 물을 넣고 부드러워질 때까지 조립니다."]]];
const recipes=Object.fromEntries(recipeRows.map(([name,ingredients,steps])=>[name,{ingredients,steps}]));

const month=document.getElementById('food-month'),servingsSelect=document.getElementById('food-servings');
const heading=document.getElementById('food-month-heading'),list=document.getElementById('food-list');
const result=document.getElementById('food-result'),picker=document.getElementById('food-pick');
const reveal=document.getElementById('food-show-recipe'),basket=document.getElementById('food-shopping-list');
const count=document.getElementById('food-shopping-count'),copy=document.getElementById('food-copy');
const clearDone=document.getElementById('food-clear-done'),clearAll=document.getElementById('food-clear-all');
if(!month||!servingsSelect||!heading||!list||!result||!picker||!reveal||!basket||!count||!copy||!clearDone||!clearAll)return;
const prefix=location.pathname.startsWith('/life/')?'/life/':'/';
const storageKey='life_food_grocery_v1';
const el=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x;};
const format=n=>String(Number(n.toFixed(2)));
function load(){
 try{
  const v=JSON.parse(localStorage.getItem(storageKey)||'[]');
  return Array.isArray(v)?v.filter(x=>x&&typeof x.name==='string'&&x.name.length<=60&&typeof x.unit==='string'&&x.unit.length<=20&&Number.isFinite(x.qty)&&x.qty>0&&x.qty<100000&&typeof x.checked==='boolean').slice(0,100):[];
 }catch{return [];}
}
let groceries=load(),current=[],selected='',open=new Set();
const portion=()=>Number(servingsSelect.value)||2;
const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(groceries));}catch{/* session only */}};
function card(row,index){
 const [name,meal,keep,query]=row, recipe=recipes[meal];
 if(!recipe)throw Error('No recipe for '+meal);
 const article=el('article','food-card');article.id='food-recipe-'+index;
 const top=el('div','food-card-top');top.append(el('h3','',name));article.append(top);
 const info=el('p','food-recipe');info.append(el('strong','','추천 메뉴 '),document.createTextNode(meal));article.append(info);
 const note=el('p','food-keep');note.append(el('strong','','보관 팁 '),document.createTextNode(keep));article.append(note);
 const details=el('details','food-recipe-details');details.open=open.has(meal);
 details.append(el('summary','','레시피 보기'));
 details.addEventListener('toggle',()=>{if(details.open)open.add(meal);else open.delete(meal);});
 const ingredients=el('ul','food-ingredients');
 for(const [label,qty,unit] of recipe.ingredients)ingredients.append(el('li','',label+' '+format(qty*portion()/2)+unit));
 details.append(ingredients);
 const steps=el('ol','food-steps');
 for(const step of recipe.steps)steps.append(el('li','',step));
 details.append(steps);
 const put=el('button','food-add-basket','장보기 목록에 담기');put.type='button';
 put.addEventListener('click',()=>{
  for(const [label,qty,unit] of recipe.ingredients){
   const amount=Number((qty*portion()/2).toFixed(2));
   const found=groceries.find(x=>x.name===label&&x.unit===unit);
   if(found){found.qty=Number((found.qty+amount).toFixed(2));found.checked=false;}
   else if(groceries.length<100)groceries.push({name:label,qty:amount,unit,checked:false});
  }
  save();drawBasket();put.textContent='담았습니다';
 });
 details.append(put);article.append(details);
 const buy=el('a','food-buy','관련 상품 검색 ↗');buy.href=prefix+'deals/?q='+encodeURIComponent(query)+'&src=food';
 article.append(buy);return article;
}
function drawBasket(){
 basket.replaceChildren();
 const pending=groceries.filter(x=>!x.checked).length;
 count.textContent=groceries.length?'전체 '+groceries.length+'개 · 남은 항목 '+pending+'개':'장보기 목록이 비어 있습니다.';
 groceries.forEach((x,index)=>{
  const row=el('div','food-shopping-row'),label=el('label','food-shopping-check');
  const cb=el('input');cb.type='checkbox';cb.checked=x.checked;
  cb.addEventListener('change',()=>{x.checked=cb.checked;save();drawBasket();});
  label.append(cb,el('span',x.checked?'food-checked':'',x.name+' '+format(x.qty)+x.unit));
  const search=el('a','food-shopping-search','상품 검색');
  search.href=prefix+'deals/?q='+encodeURIComponent(x.name)+'&src=food';
  const remove=el('button','food-shopping-remove','삭제');remove.type='button';
  remove.setAttribute('aria-label',x.name+' 삭제');
  remove.addEventListener('click',()=>{groceries.splice(index,1);save();drawBasket();});
  row.append(label,search,remove);basket.append(row);
 });
 copy.disabled=!groceries.length;
 clearDone.disabled=!groceries.some(x=>x.checked);
 clearAll.disabled=!groceries.length;
}
function showMonth(){
 const num=Number(month.value);if(!Number.isInteger(num)||!monthly[num])return;
 current=monthly[num];selected=current[0][1];open=new Set();
 heading.textContent=num+'월 제철 식재료';
 const november=document.getElementById('food-november-source');if(november)november.hidden=num!==11;
 list.replaceChildren(...current.map(card));
 result.textContent='오늘의 추천: '+selected;
}
month.addEventListener('change',showMonth);
servingsSelect.addEventListener('change',()=>{list.replaceChildren(...current.map(card));});
picker.addEventListener('click',()=>{
 const choices=current.map(r=>r[1]).filter(x=>x!==selected);
 if(!choices.length)return;
 selected=choices[Math.floor(Math.random()*choices.length)];
 result.textContent='오늘의 추천: '+selected;
});
reveal.addEventListener('click',()=>{
 const index=current.findIndex(r=>r[1]===selected);
 const article=document.getElementById('food-recipe-'+index);
 if(!article)return;
 const details=article.querySelector('details');if(details)details.open=true;
 article.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});
copy.addEventListener('click',async()=>{
 const value=groceries.map(x=>(x.checked?'[x] ':'[ ] ')+x.name+' '+format(x.qty)+x.unit).join('\n');
 if(!value)return;
 try{if(!navigator.clipboard?.writeText)throw Error('not available');await navigator.clipboard.writeText(value);count.textContent='장보기 목록을 복사했습니다.';}
 catch{count.textContent='복사할 수 없습니다. 목록을 선택해 직접 복사하세요.';}
});
clearDone.addEventListener('click',()=>{groceries=groceries.filter(x=>!x.checked);save();drawBasket();});
clearAll.addEventListener('click',()=>{groceries=[];save();drawBasket();});
const now=Number(new Intl.DateTimeFormat('en-US',{month:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
month.value=String(now);showMonth();drawBasket();
})();
