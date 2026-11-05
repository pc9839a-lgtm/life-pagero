(()=>{
'use strict';
const month=document.getElementById('food-month');
const heading=document.getElementById('food-month-heading');
const list=document.getElementById('food-list');
const result=document.getElementById('food-result');
const picker=document.getElementById('food-pick');
if(!month||!heading||!list||!result||!picker)return;
// Representative seasonal foods, not a claim of certified harvest dates.
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
let menu=[];
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node;};
const add=(parent,...children)=>{parent.append(...children);return parent;};
function card([name,meal,keep,query]){
 const article=el('article','food-card');
 const top=el('div','food-card-top');
 add(top,el('h3','',name));article.append(top);
 const recipe=el('p','food-recipe');add(recipe,el('strong','','추천 메뉴 '),document.createTextNode(meal));article.append(recipe);
 const storage=el('p','food-keep');add(storage,el('strong','','보관 팁 '),document.createTextNode(keep));article.append(storage);
 const link=el('a','food-buy','관련 상품 검색 ↗');
 link.href='/deals/?q='+encodeURIComponent(query);
 article.append(link);return article;
}
function show(value){
 const number=Number(value);
 if(!Number.isInteger(number)||!monthly[number])return;
 const rows=monthly[number];
 menu=rows.map(row=>row[1]);
 heading.textContent=number+'월 제철 식재료';
 list.replaceChildren(...rows.map(card));
 result.textContent='오늘의 추천: '+menu[0];
}
month.addEventListener('change',()=>show(month.value));
picker.addEventListener('click',()=>{
 if(!menu.length)return;
 const current=result.textContent.replace('오늘의 추천: ','');
 const other=menu.filter(item=>item!==current);
 const choices=other.length?other:menu;
 result.textContent='오늘의 추천: '+choices[Math.floor(Math.random()*choices.length)];
});
const localMonth=Number(new Intl.DateTimeFormat('en-US',{month:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
month.value=String(localMonth);
show(localMonth);
})();
