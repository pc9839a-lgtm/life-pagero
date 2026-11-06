import {spawnSync} from 'node:child_process';
// Production-facing, credential-free diagnostics for public food affiliate API.
// Does not print private keys, full provider URLs, or user data.
const checks=[
  ['public-scallop-general','https://pagero.kr/life/deals/api?mode=search&q='+encodeURIComponent('가리비')+'&src=food'],
  ['public-scallop-specific','https://pagero.kr/life/deals/api?mode=search&q='+encodeURIComponent('홍가리비')+'&src=food'],
  ['public-potato-general','https://pagero.kr/life/deals/api?mode=search&q='+encodeURIComponent('고구마')+'&src=food'],
  ['origin-scallop-general','https://life-pagero.pages.dev/deals/api?mode=search&q='+encodeURIComponent('가리비')+'&src=food']
];
await Promise.all(checks.map(async([name,url])=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7500);
  try{
    const start=Date.now();
    const response=await fetch(url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
    const raw=await response.text();
    let data;
    try{data=JSON.parse(raw)}catch{}
    console.log('[food-shop-live]',JSON.stringify({
      name,http:response.status,ms:Date.now()-start,
      result:data?.status||'invalid-response',
      itemCount:Array.isArray(data?.items)?data.items.length:null,
      items:Array.isArray(data?.items)?data.items.slice(0,4).map(x=>x.title?.slice(0,70)):[],
      responseType:response.headers.get('content-type')
    }));
  }catch(error){console.log('[food-shop-live]',JSON.stringify({name,error:String(error?.message||error)}))}
  finally{clearTimeout(timer)}
}));


// Headless browser check of actual running public JS, not a source-only assertion.
for(const slug of ['scallops-clean-steam-storage','sweet-potato-storage-guide']){
  const url='https://pagero.kr/life/food/'+slug+'/';
  const chrome=spawnSync('google-chrome',[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--virtual-time-budget=9000','--dump-dom',url
  ],{encoding:'utf8',timeout:17500,maxBuffer:12*1024*1024});
  const dom=chrome.stdout||'';
  const shopStatus=dom.match(/class="food-shop-status"[^>]*>([^<]*)<\/p>/)?.[1]||'not-found';
  const cards=(dom.match(/class="food-shop-product(?: food-shop-product-first)?"/g)||[]).length;
  const sectionIndex=dom.indexOf('id="food-shopping"');
  const tableIndex=dom.indexOf('해감과 익힘, 헷갈리기 쉬운 부분');
  console.log('[food-browser]',JSON.stringify({
    slug,exit:chrome.status,htmlBytes:dom.length,hasShopSection:sectionIndex!==-1,
    cards,shopStatus:shopStatus.slice(0,80),shopBeforeTable:sectionIndex!==-1&&
    tableIndex!==-1&&sectionIndex<tableIndex,
    scriptVersioned:/food-guide-products\.js\?v=[a-f0-9]{12}/.test(dom),
    stderr:(chrome.stderr||'').split('\n').filter(s=>/ERROR|ERR_/.test(s)).slice(-2)
  }));
}
