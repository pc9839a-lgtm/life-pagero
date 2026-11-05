// Nonblocking deployment smoke-audit. Used by CI to catch 200 HTML responses
// for CSS/JS, stale Pages deployments, broken proxy routes and wrong mime types.
const targets=[
 ['public home','https://pagero.kr/life/','text/html','life-editorial-20261106.css'],
 ['upstream home','https://life-pagero.pages.dev/','text/html','life-editorial-20261106.css'],
 ['public CSS','https://pagero.kr/life/life-editorial-20261106.css','text/css','body.life-editorial'],
 ['upstream CSS','https://life-pagero.pages.dev/life-editorial-20261106.css','text/css','body.life-editorial'],
 ['public savings','https://pagero.kr/life/finance/savings-calculator/','text/html','savings-calc-page'],
 ['upstream savings','https://life-pagero.pages.dev/finance/savings-calculator/','text/html','savings-calc-page'],
 ['public savings JS','https://pagero.kr/life/savings-calculator.js','javascript','savings-math.js'],
 ['upstream savings JS','https://life-pagero.pages.dev/savings-calculator.js','javascript','savings-math.js']
];
const results=await Promise.all(targets.map(async([name,url,mime,marker])=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),11500);
  try{
    const response=await fetch(url,{signal:controller.signal,redirect:'follow',
      headers:{'User-Agent':'LifePagero-Deployment-CSS-Checker/1.0','Cache-Control':'no-cache'}});
    const body=await response.text();
    const type=response.headers.get('content-type')||'';
    const ok=response.ok&&type.includes(mime)&&body.includes(marker);
    return {name,status:response.status,ok,mime:type,length:body.length,hasMarker:body.includes(marker),
      url:response.url,proxy:response.headers.get('x-pagero-life-proxy')};
  }catch(error){return {name,ok:false,error:String(error.message||error)}}
  finally{clearTimeout(timeout)}
}));
for(const result of results)console.log('[css-live]',JSON.stringify(result));
console.log('[css-live] '+results.filter(r=>r.ok).length+'/'+results.length+' assets/pages confirmed at public and upstream domains.');


// Hot Deals deployment audit: compare exact markup/JS/CSS versions across
// legacy subdomain, canonical /life proxy, and upstream Cloudflare Pages.
// A successful HTTP response can still be stale or a fallback HTML page.
const probes=[
  ["canonical","https://pagero.kr/life/"],
  ["upstream","https://life-pagero.pages.dev/"],
  ["legacy","https://life.pagero.kr/"]
];
const checks=[
  ["deals-html","deals/","<h1>오늘의 핫딜</h1>","?v=20261106e"],
  ["deals-js","adpick-deals.js","const areas=","수익 추천"],
  ["deals-css","adpick-deals.css",".adpick-page-heading",".life-editorial .adpick-deals"]
];
const snapshots=await Promise.all(probes.flatMap(([origin,base])=>checks.map(async([asset,path,expected,old])=>{
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),10000);
 const url=base+path;
 try{
  const response=await fetch(url,{signal:controller.signal,redirect:"follow",headers:{"User-Agent":"LifePagero-Hotdeal-Deployment-Audit/1.0","Cache-Control":"no-cache"}});
  const body=await response.text();
  return {origin,asset,status:response.status,url:response.url,mime:response.headers.get("content-type"),
    bytes:body.length,expected:body.includes(expected),newAssetVersion:body.includes("20261106e"),
    oldDeveloperCopy:body.includes("상품 데이터를 별도로 저장하거나"),
    oldCommissionTab:body.includes("수익 추천"),
    hasNewDarkHero:asset==="deals-css"?body.includes("background:#202833"):undefined,
    hasFeaturedCard:asset==="deals-js"?body.includes("adpick-card--featured"):undefined,
    cache:response.headers.get("cf-cache-status"),proxy:response.headers.get("x-pagero-life-proxy"),
    etag:response.headers.get("etag"),
    adpickResources:asset==="deals-html"?[...body.matchAll(/(?:href|src)="([^"]*adpick-deals[^"]*)"/g)].map(m=>m[1]):undefined,
    isEditorialBody:asset==="deals-html"?body.includes("life-editorial"):undefined};
 }catch(e){return {origin,asset,error:String(e.message||e)}}
 finally{clearTimeout(timeout)}
})));
for(const data of snapshots)console.log("[hotdeal-live]",JSON.stringify(data));
console.log("[hotdeal-live] Inspect false 'expected', oldDeveloperCopy=true, or oldCommissionTab=true to pinpoint stale origin versus proxy.");
