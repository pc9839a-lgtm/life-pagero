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
