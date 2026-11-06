import assert from 'node:assert/strict';
import { cached } from '../functions/today/api/_shared.js';

const realCaches=globalThis.caches;
const realNow=Date.now;
let now=1_900_000_000_000;
Date.now=()=>now;
class FakePoPCache{
  constructor(){this.data=new Map();this.puts=0;}
  async match(request){
    const entry=this.data.get(request.url);
    if(!entry||entry.expires<=now)return undefined;
    return new Response(entry.text,{status:entry.status,headers:entry.headers});
  }
  async put(request,response){
    const match=/s-maxage=(\d+)/.exec(response.headers.get('cache-control')||'');
    if(!match)throw Error('Uncacheable test response');
    const age=Number(match[1]);
    this.data.set(request.url,{
      text:await response.clone().text(),
      headers:[...response.headers],
      status:response.status,expires:now+age*1000
    });
    this.puts++;
  }
}
const waiters=[];
const context=()=>({waitUntil(p){waiters.push(p);}});
const drain=async()=>{
  const tasks=waiters.splice(0);
  await Promise.all(tasks);
};
const store=new FakePoPCache();
globalThis.caches={default:store};

try{
  let sourceCalls=0;
  const loader=async()=>{
    sourceCalls++;
    return {source:'verified fixture',value:sourceCalls};
  };
  const options={staleSeconds:1200,retrySeconds:180};
  const first=await cached(context(),'shared-people',60,loader,options);
  assert.equal(first.status,200);
  assert.equal(first.headers.get('x-life-data-cache'),'MISS');
  assert.equal((await first.json()).value,1);
  assert.equal(sourceCalls,1);
  assert.equal(store.puts,2,'fresh and stale versions should be cached');
  const second=await cached(context(),'shared-people',60,loader,options);
  assert.equal(second.headers.get('x-life-data-cache'),'HIT');
  assert.equal((await second.json()).value,1);
  assert.equal(sourceCalls,1,'second visitor must not refetch upstream');

  now+=61_000;
  const third=await cached(context(),'shared-people',60,loader,options);
  assert.equal(third.headers.get('x-life-data-cache'),'STALE');
  assert.equal((await third.json()).value,1,'stale snapshot must show original verified value');
  await drain();
  assert.equal(sourceCalls,2,'only one background refresh after expiration');
  const fourth=await cached(context(),'shared-people',60,loader,options);
  assert.equal((await fourth.json()).value,2);
  assert.equal(fourth.headers.get('x-life-data-cache'),'HIT');

  now+=61_000;
  let failedRefreshes=0;
  const failed=async()=>{failedRefreshes++;throw Error('UPSTREAM_UNAVAILABLE');};
  const stale=await cached(context(),'shared-people',60,failed,options);
  assert.equal(stale.headers.get('x-life-data-cache'),'STALE');
  assert.equal((await stale.json()).value,2);
  await drain();
  assert.equal(failedRefreshes,1);
  const visitorAfterError=await cached(context(),'shared-people',60,failed,options);
  assert.equal(visitorAfterError.headers.get('x-life-data-cache'),'STALE');
  await drain();
  assert.equal(failedRefreshes,1,'retry lease must prevent upstream stampede');

  // Weather city variants must not contaminate each other, while users
  // of the same city share the response.
  const seoul=await cached(context(),'weather-seoul',3600,
    async()=>({city:'seoul',temp:12}),{staleSeconds:7200});
  const incheon=await cached(context(),'weather-incheon',3600,
    async()=>({city:'incheon',temp:9}),{staleSeconds:7200});
  assert.equal((await seoul.json()).city,'seoul');
  assert.equal((await incheon.json()).city,'incheon');
  const sameCity=await cached(context(),'weather-seoul',3600,
    async()=>{throw Error('UNEXPECTED_RELOAD')},{staleSeconds:7200});
  assert.equal((await sameCity.json()).temp,12);
  await assert.rejects(()=>cached(context(),'../../bad',60,loader),/INVALID_CACHE_KEY/);

  // A cold failure is short-term cached so new visitors do not refetch
  // every time the upstream provider has an outage.
  let outages=0;
  const coldFail=async()=>{outages++;throw Error('UPSTREAM_DOWN');};
  const a=await cached(context(),'cold-down',60,coldFail,options);
  const b=await cached(context(),'cold-down',60,coldFail,options);
  assert.equal(a.status,502);
  assert.equal(b.status,502);
  assert.equal(outages,1);
  console.log('[today-cache] PASS: multiple users share one fetch, stale-first response, one lease, outage and city isolation');
}finally{
  if(realCaches===undefined)delete globalThis.caches;
  else globalThis.caches=realCaches;
  Date.now=realNow;
}
