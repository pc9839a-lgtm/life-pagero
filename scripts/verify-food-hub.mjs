import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DIST=path.resolve('dist');
const read=file=>fs.readFileSync(path.join(DIST,file),'utf8');
const check=(ok,reason)=>{if(!ok)throw Error('[food-qa] '+reason);};
const page=read('food/index.html');
const nav=page.match(/<nav\b[^>]*class="main-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0]||'';
check(page.includes('<h1>제철음식</h1>'),'food route missing heading');
for(const redundant of ['식재료 · 집밥 · 장보기','이번 달 먹기 좋은 재료를 살펴보고','이번 달 식재료를 활용한 집밥 메뉴를 하나 골라보세요','아래 링크는 기존 제휴 상품 검색 메뉴로 이동합니다.']){
 check(!page.includes(redundant),'redundant explanatory copy present: '+redundant);
}
check(page.includes('name="robots" content="index,follow"'),'food route must be indexable');
check(page.includes('href="https://pagero.kr/life/food/"'),'food canonical wrong');
check((page.match(/<link rel="canonical"/g)||[]).length===1,'duplicate canonical');
check(page.includes('id="food-month"')&&page.includes('id="food-list"'),'month selector missing');
check(page.includes('id="food-pick"')&&page.includes('id="food-result"'),'dinner picker missing');
check(page.includes('삼치')&&page.includes('가리비')&&page.includes('해양수산부 발표 확인'),'verified November example missing');
check(page.includes('관련 상품 검색')&&page.includes('/deals/?q='),'ADPICK search handoff missing');
check(page.includes('제휴 상품 링크를 통해 구매하면'),'affiliate disclosure missing');
const foodCssHash=createHash('sha256').update(read('life-food.css')).digest('hex').slice(0,12);
check(page.includes('src="/life-food.js"')&&
  page.includes('href="/life-food.css?v='+foodCssHash+'"'),
  'food assets or current versioned CSS missing');
check((nav.match(/<a href=/g)||[]).length===8,'eight-link navigation missing');
check(nav.includes('<a href="/food/" aria-current="page">먹거리</a>'),'food active menu missing');
check(read('sitemap.xml').includes('<loc>https://pagero.kr/life/food/</loc>'),'sitemap missing');
check(JSON.parse(read('search-index.json')).some(item=>item.url==='/food/'),'search index missing');
const js=read('life-food.js'), deals=read('adpick-deals.js'), css=read('life-food.css');
for(let month=1;month<=12;month++)check(js.includes(month+':['),'missing season '+month);
check(js.includes("timeZone:'Asia/Seoul'"),'KST automatic month missing');
check(js.includes('encodeURIComponent(query)'),'shopping query not URL-safe');
check(deals.includes('new URLSearchParams(location.search).get("q")'),'existing ADPICK page missing incoming search');
check(deals.includes('rel="sponsored noopener noreferrer"')||deals.includes('a.rel="sponsored noopener noreferrer"'),'paid outbound link labeling lost');
check(!js.includes('ADPICK_BIZ_API_KEY')&&!page.includes('ADPICK_BIZ_API_KEY'),'API key reference leaked');
check(css.includes('@media(max-width:700px)'),'mobile breakpoint missing');
for(const id of ['food-servings','food-show-recipe','food-shopping-list','food-shopping-count','food-copy','food-clear-done','food-clear-all','food-november-source']){
 check(page.includes('id="'+id+'"'),'missing functional food control '+id);
}
for(const marker of ['life_food_grocery_v1',"localStorage.getItem(storageKey)","localStorage.setItem(storageKey,","navigator.clipboard.writeText"]){
 check(js.includes(marker),'missing persistence or copy action '+marker);
}
const match=js.match(/const recipeRows=(\[[^\n]+\]);/);
check(Boolean(match),'recipe dataset missing');
const recipes=JSON.parse(match[1]);
check(recipes.length>=36,'recipe count regression '+recipes.length);
const names=new Set(recipes.map(([name,ingredients,steps])=>{
 check(typeof name==='string'&&name.length>1,'invalid recipe title');
 check(Array.isArray(ingredients)&&ingredients.length>0,'ingredients missing '+name);
 check(Array.isArray(steps)&&steps.length>=2,'preparation steps missing '+name);
 for(const [ingredient,qty,unit] of ingredients)check(
  typeof ingredient==='string'&&ingredient.length>0&&Number.isFinite(qty)&&qty>0&&
  typeof unit==='string'&&unit.length>0,'invalid recipe quantity '+name);
 return name;
}));
check(names.size===recipes.length,'duplicate recipe names');
const months=js.split('const monthly={')[1]?.split('\n};')[0]||'';
const meals=[...months.matchAll(/\['[^']+','([^']+)'/g)].map(m=>m[1]);
check(meals.length>=35,'seasonal dataset unexpectedly reduced');
for(const meal of meals)check(names.has(meal),'seasonal menu lacking recipe '+meal);
for(const fragment of ['&amp;src=food','food-november-source']){
 check(page.includes(fragment),'static food attribution/source missing '+fragment);
}
check(js.includes("november.hidden=num!==11"),'November reference should be hidden for other months');
check(js.includes("'&src=food'"),'dynamic food links missing attribution');
check(deals.includes('query.set("src","food")'),'referral attribution not forwarded to affiliate API');
const api=fs.readFileSync(path.resolve('functions/deals/api.js'),'utf8');
check(api.includes('"life_food_search"'),'missing affiliate source distinction');
for(const marker of ['.food-shopping-row','.food-recipe-details','.food-shopping-actions']){
 check(css.includes(marker),'food UI style missing '+marker);
}

console.log('[food-qa] PASS: eight-link menu, 12 months, 36 recipes, grocery persistence, affiliate tracking and SEO.');
