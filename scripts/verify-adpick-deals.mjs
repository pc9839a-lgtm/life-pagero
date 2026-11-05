import fs from "node:fs";
import path from "node:path";
import {onRequestGet} from "../functions/deals/api.js";

const DIST=path.resolve("dist");
const read=p=>fs.readFileSync(path.join(DIST,p),"utf8");
const check=(value,label)=>{if(!value)throw Error("[adpick-qa] "+label);};
const home=read("index.html"),page=read("deals/index.html");
const origin=read("life-editorial-20261105.css");
check(home.includes('class="adpick-home-entry"'),'homepage shortcut missing');
check(home.includes('href="/deals/"'),'homepage route missing');
check(home.includes('href="/adpick-deals.css?v=20261106d"'),'homepage shortcut style missing');
check(page.includes('<h1>오늘의 핫딜</h1>'),'standalone deals H1 missing');
check(page.includes('class="adpick-page-heading"'),'shopping heading layout missing');
check(page.includes('class="adpick-search-field"'),'prominent shopping search missing');
check(page.includes('class="adpick-products"'),'product list layout missing');
const shoppingStyles=read("adpick-deals.css");
check(shoppingStyles.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'desktop shopping grid missing');
check(shoppingStyles.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'mobile two-column grid missing');
check(shoppingStyles.includes('var(--brand,#e95731)'),'site accent color missing');
check(home.includes('<h2>오늘의 핫딜</h2>'),'homepage deals title missing');
for(const unwanted of ['수익 추천', '애드픽 비즈 API 제공', '상품 데이터를 별도로 저장하거나', '가격 인하 상품이라는 의미가 아닙니다']) {
 check(!page.includes(unwanted),'internal implementation copy leaked into deals page: '+unwanted);
}
const client=read("adpick-deals.js");
check(!client.includes("수익 추천"),"publisher-only commission tab leaked");
check(!client.includes('["commission"'),"commission category displayed in tabs");
check(page.includes("제휴 링크가 포함되어 있으며")&&page.includes("수수료가 지급될 수 있습니다"),"affiliate disclosure lost");
check(page.includes('name="robots" content="noindex,follow"'),'affiliate-only route must noindex');
check(page.includes('data-deals-list')&&page.includes('data-deals-search'),'live deals and search controls missing');
check(page.includes('href="/adpick-deals.css?v=20261106d"')&&page.includes('src="/adpick-deals.js?v=20261106d"'),'deals versioned assets missing');
check(home.includes('href="/adpick-deals.css?v=20261106d"'),'homepage versioned CSS missing');
const headers=fs.readFileSync(path.resolve("dist/_headers"),"utf8");
check(headers.includes('/deals/')&&headers.includes('/adpick-deals.js')&&headers.includes('no-store'),'hotdeal cache control missing');
check(page.includes('href="https://pagero.kr/life/deals/"'),'wrong canonical');
check(origin.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'mobile 6-item navigation grid missing');
check(fs.existsSync(path.join(DIST,"adpick-deals.js")),'deals frontend JS missing');
check(fs.existsSync(path.join(DIST,"adpick-deals.css")),'deals CSS missing');
for(const relative of ["index.html","today/index.html","finance/index.html","topics/index.html","deals/index.html","food/index.html","events/index.html"]){
 const html=read(relative);
 const nav=html.match(/<nav\b[^>]*class="main-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0]||"";
 check((nav.match(/<a href=/g)||[]).length===7,'seven nav items not shown '+relative);
 check(nav.includes('<a href="/deals/"'),'nav hot deals link missing '+relative);
}
const realFetch=globalThis.fetch;
let hits=0,foodTagged=0;
try{
 globalThis.fetch=async(url)=>{
   hits++;
   const path=String(url);
   if(path.includes("p_data=life_food_search"))foodTagged++;
   check(path.includes('/api/test-placeholder/best?')||path.includes('/api/test-placeholder/search?'),'wrong API host or path');
   if(path.includes('/best?'))return new Response(JSON.stringify({success:true,data:{area:"today",list:[
      {title:"테스트 상품",price:32900,photo:"https://static.example.com/p.jpg",cp_name:"샘플 몰",commissionlink:"https://link.adpick.co.kr/test"}
   ]}}),{status:200});
   return new Response(JSON.stringify({success:true,data:[
      {title:"검색 상품",price:"29,900원",photo:"https://static.example.com/q.jpg",cp_name:"샘플 몰",commissionlink:"https://link.adpick.co.kr/search"}
   ]}),{status:200});
 };
 const headers={Accept:"application/json"};
 const context=uri=>({request:new Request(uri,{headers}),env:{ADPICK_BIZ_API_KEY:"test-placeholder"}});
 const best=await onRequestGet(context("https://life.example.com/deals/api?area=today"));
 const bestBody=await best.json();
 check(best.status===200&&bestBody.status==="ok"&&bestBody.items.length===1,'best mock failure');
 check(bestBody.items[0].commissionlink==="https://link.adpick.co.kr/test",'affiliate link was rewritten');
 check(best.headers.get("cache-control")?.includes("no-store"),'no-store response required');
 const search=await onRequestGet(context("https://life.example.com/deals/api?mode=search&q=%EC%BB%A4%ED%94%BC"));
 const searched=await search.json();
 check(searched.items[0].price==="29,900원",'search price altered');
 const invalid=await onRequestGet(context("https://life.example.com/deals/api?mode=search&q=x"));
 check(invalid.status===400,'invalid search not rejected');
 const missing=await onRequestGet({request:new Request("https://life.example.com/deals/api"),env:{}});
 check(missing.status===503,'missing secret not rejected');
 const food=await onRequestGet(context("https://life.example.com/deals/api?mode=search&q=%EC%82%BC%EC%B9%98&src=food"));
 check(food.status===200&&foodTagged===1,"food attribution failed");
 check(hits===3,"unexpected affiliate API request count");
} finally {globalThis.fetch=realFetch;}
console.log("[adpick-qa] PASS: separate Hot Deals menu, homepage entry, noindex offer listings, API secret isolation and no-cache responses.");
