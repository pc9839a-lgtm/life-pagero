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
check(home.includes('href="/adpick-deals.css"'),'homepage shortcut style missing');
check(page.includes('<h1>쇼핑 추천상품</h1>'),'standalone deals H1 missing');
check(page.includes('name="robots" content="noindex,follow"'),'affiliate-only route must noindex');
check(page.includes('data-deals-list')&&page.includes('data-deals-search'),'live deals and search controls missing');
check(page.includes('href="/adpick-deals.css"')&&page.includes('src="/adpick-deals.js"'),'deals assets missing');
check(page.includes('href="https://pagero.kr/life/deals/"'),'wrong canonical');
check(origin.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'mobile 5-item navigation grid missing');
check(fs.existsSync(path.join(DIST,"adpick-deals.js")),'deals frontend JS missing');
check(fs.existsSync(path.join(DIST,"adpick-deals.css")),'deals CSS missing');
for(const relative of ["index.html","today/index.html","finance/index.html","topics/index.html","deals/index.html"]){
 const html=read(relative);
 const nav=html.match(/<nav\b[^>]*class="main-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0]||"";
 check((nav.match(/<a href=/g)||[]).length===5,'five nav items not shown '+relative);
 check(nav.includes('<a href="/deals/"'),'nav hot deals link missing '+relative);
}
const realFetch=globalThis.fetch;
let hits=0;
try{
 globalThis.fetch=async(url)=>{
   hits++;
   const path=String(url);
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
 check(hits===2,'unneeded external source requests');
} finally {globalThis.fetch=realFetch;}
console.log("[adpick-qa] PASS: separate Hot Deals menu, homepage entry, noindex offer listings, API secret isolation and no-cache responses.");
