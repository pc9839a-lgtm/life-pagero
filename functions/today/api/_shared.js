// Shared per-Cloudflare-data-center edge cache for public Today datasets.
// Values are identical across visitors: no cookies, IP, user tokens or
// request-specific parameters in keys. A separate, longer-lived stale entry
// preserves the last verified data during upstream outages.
// Cloudflare Cache API is per PoP, not globally replicated. No KV / D1 writes.

const CACHE_ORIGIN='https://life-pagero.pages.dev/today/api/';
const inFlight=new Map();
const cacheKey=(key,kind)=>new Request(CACHE_ORIGIN+key+'__'+kind,{method:'GET'});
const cacheAvailable=()=>typeof caches!=='undefined'&&caches.default?caches.default:null;
const forCache=(response,age)=> {
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','public, max-age=0, s-maxage='+age);
  return new Response(response.clone().body,{status:response.status,headers});
};
const served=(response,label,age)=>{
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','public, max-age=120, s-maxage='+age);
  headers.set('X-Life-Data-Cache',label);
  return new Response(response.body,{status:response.status,headers});
};
const lockResponse=seconds=>new Response('pending',{
  headers:{'Cache-Control':'public, max-age=0, s-maxage='+seconds}
});
export function json(body,status=200,seconds=0){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':status===200
        ?'public, max-age=120, s-maxage='+seconds
        :'no-store',
      'X-Content-Type-Options':'nosniff'
    }
  });
}
export async function cached(context,key,seconds,loader,options={}){
  if(!/^[a-z0-9-]+$/.test(key))throw Error('INVALID_CACHE_KEY');
  const freshSeconds=Math.max(60,Math.floor(seconds));
  const staleSeconds=Math.max(freshSeconds,Math.floor(options.staleSeconds||freshSeconds*3));
  const retrySeconds=Math.max(60,Math.floor(options.retrySeconds||300));
  const store=cacheAvailable();
  const freshKey=cacheKey(key,'fresh');
  const staleKey=cacheKey(key,'stale');
  const leaseKey=cacheKey(key,'refresh-lease');
  const failureKey=cacheKey(key,'failure-cooldown');

  async function update(){
    // Single-flight avoids duplicate upstream requests within a Worker isolate.
    if(inFlight.has(key))return inFlight.get(key);
    const task=(async()=>{
      const data=await loader();
      const snapshot=json({status:'ok',retrievedAt:new Date().toISOString(),...data},200,freshSeconds);
      if(store){
        // Wait for the local cache writes; subsequent visitors can reuse this
        // data even when the original request has completed.
        await Promise.all([
          store.put(freshKey,forCache(snapshot,freshSeconds)),
          store.put(staleKey,forCache(snapshot,staleSeconds))
        ]);
      }
      return snapshot;
    })();
    inFlight.set(key,task);
    try{return await task;}finally{inFlight.delete(key);}
  }

  if(store){
    const fresh=await store.match(freshKey);
    if(fresh)return served(fresh,'HIT',freshSeconds);
    const stale=await store.match(staleKey);
    if(stale){
      // Only one revalidation lease per edge PoP per retry window; visitors
      // receive the last validated snapshot immediately while it updates.
      // Non-atomic Cache API leases and multiple PoPs still allow rare races.
      const lease=await store.match(leaseKey);
      if(!lease && typeof context.waitUntil==='function'){
        try{
          await store.put(leaseKey,lockResponse(retrySeconds));
          context.waitUntil(update().catch(error=>{
            console.warn('today stale refresh failed',key,String(error?.message||error));
          }));
        }catch(error){
          console.warn('today refresh lease failed',key,String(error?.message||error));
        }
      }
      // Never advertise stale data as current: keep original retrievedAt
      // and observation/source dates from the previously validated snapshot.
      return served(stale,'STALE',60);
    }
    const cooldown=await store.match(failureKey);
    if(cooldown)return json({
      status:'unavailable',source:key,message:'현재 자료를 확인할 수 없습니다.'
    },502);
  }
  try{
    const snapshot=await update();
    return served(snapshot,'MISS',freshSeconds);
  }catch(error){
    console.warn('today dashboard source failed',key,String(error?.message||error));
    if(store){
      try{await store.put(failureKey,lockResponse(retrySeconds));}
      catch(writeError){console.warn('today cache failure lease failed',key,String(writeError?.message||writeError));}
    }
    return json({status:'unavailable',source:key,
      message:'현재 자료를 확인할 수 없습니다.'},502);
  }
}
export function finite(value){
  if(value===''||value==null)return null;
  const n=Number(String(value).replaceAll(',',''));
  return Number.isFinite(n)?n:null;
}
export function text(value,limit=170){
  return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,limit);
}
