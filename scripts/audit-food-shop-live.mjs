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
