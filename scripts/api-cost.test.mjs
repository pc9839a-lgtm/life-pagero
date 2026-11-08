import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {onRequestGet as fss} from '../functions/finance/api/products.js';
import {onRequestGet as issues} from '../functions/finance/api/issues.js';

test('Finance public feeds share per-PoP snapshots, ignore query order, expire and throttle outages',async()=>{
  const realFetch=globalThis.fetch,oldCaches=globalThis.caches,oldNow=Date.now;
  let now=Date.now(),fssCalls=0,rssCalls=0;
  const pending=[];
  const cache=new Map();
  globalThis.caches={default:{
    async match(request){
      const row=cache.get(request.url);
      return row&&row.expires>now?new Response(row.text,{status:row.status,headers:row.headers}):undefined;
    },
    async put(request,response){
      const seconds=Number(/s-maxage=(\d+)/.exec(response.headers.get('cache-control')||'')?.[1]);
      assert.ok(seconds>0,'cache entry must specify positive edge lifetime');
      cache.set(request.url,{
        text:await response.clone().text(),status:response.status,
        headers:[...response.headers],expires:now+seconds*1000
      });
    }
  }};
  Date.now=()=>now;
  const fixture={
    result:{err_cd:'000',max_page_no:1,
      baseList:[{fin_co_no:'001',fin_prdt_cd:'test',kor_co_nm:'검증은행',fin_prdt_nm:'기본금리 예금'}],
      optionList:[{fin_co_no:'001',fin_prdt_cd:'test',save_trm:'12',
        intr_rate_type:'S',intr_rate:'3.1',intr_rate2:'3.4'}]
    }
  };
  let outage=false;
  globalThis.fetch=async input=>{
    const url=new URL(String(input));
    if(url.hostname==='finlife.fss.or.kr'){
      fssCalls++;
      if(outage)throw Error('FSS_DOWN');
      return Response.json(fixture);
    }
    rssCalls++;
    const date=new Date(now).toUTCString();
    const article='https://'+url.hostname+'/article/1';
    return new Response('<rss><channel><item><title>기업 실적 발표</title>'
      +'<link>'+article+'</link><pubDate>'+date+'</pubDate></item></channel></rss>',
      {headers:{'content-type':'application/xml'}});
  };
  const ctx=(url,env={FSS_API_KEY:'fixture'})=>({
    env,request:new Request(url),waitUntil(p){pending.push(p)}
  });
  const drain=async()=>{const tasks=pending.splice(0);await Promise.all(tasks);};
  try{
    const base='https://pagero.kr/finance/api/products';
    const a=await fss(ctx(base+'?kind=deposit&group=bank'));
    assert.equal(a.status,200);
    assert.equal(a.headers.get('X-Life-Data-Cache'),'MISS');
    const data=await a.json();
    assert.equal(data.products.length,1);
    assert.equal(data.products[0].baseRate,3.1);
    assert.equal(data.status,'ok');
    assert.equal(fssCalls,1);
    const b=await fss(ctx(base+'?group=bank&kind=deposit'));
    assert.equal(b.headers.get('X-Life-Data-Cache'),'HIT');
    assert.equal(fssCalls,1,'different query ordering cannot cause another FSS fetch');
    now+=21601*1000;
    const stale=await fss(ctx(base+'?kind=deposit&group=bank'));
    assert.equal(stale.headers.get('X-Life-Data-Cache'),'STALE');
    assert.equal((await stale.json()).products[0].baseRate,3.1);
    await drain();
    assert.equal(fssCalls,2,'only one background update after 6h');
    const fresh=await fss(ctx(base+'?kind=deposit&group=bank'));
    assert.equal(fresh.headers.get('X-Life-Data-Cache'),'HIT');
    outage=true;
    const broken=await fss(ctx(base+'?kind=saving&group=savingsbank'));
    assert.equal(broken.status,502);
    const brokenAgain=await fss(ctx(base+'?kind=saving&group=savingsbank'));
    assert.equal(brokenAgain.status,502);
    assert.equal(fssCalls,3,'failure cooldown prevents 2nd upstream call');
    outage=false;
    const newsUrl='https://pagero.kr/finance/api/issues';
    const issueFirst=await issues(ctx(newsUrl,{}));
    assert.equal(issueFirst.status,200);
    assert.ok((await issueFirst.json()).items.length>0);
    assert.equal(rssCalls,4,'four original publisher feeds are fetched only on a cold miss');
    const issueSecond=await issues(ctx(newsUrl,{}));
    assert.equal(issueSecond.headers.get('X-Life-Data-Cache'),'HIT');
    assert.equal(rssCalls,4,'repeat visitors reuse RSS results with no more provider calls');
  }finally{
    globalThis.fetch=realFetch;
    if(oldCaches===undefined)delete globalThis.caches;else globalThis.caches=oldCaches;
    Date.now=oldNow;
  }
});
test('Today browser cold widgets do not call APIs offscreen or from a hidden tab',async()=>{
  const script=fs.readFileSync('public/today-dashboard.js','utf8');
  assert.ok(!script.includes('setInterval(load,6*3600000)'), 'KRX must not poll every 6h');
  const observed=[];
  const weatherNode={
    dataset:{},
    querySelector(selector){
      if(selector==='[data-weather-city]')return {value:'seoul',addEventListener(){}};
      if(selector==='[data-weather-items]')return {dataset:{},hidden:false,replaceChildren(){}};
      if(selector==='[data-today-status]')return {textContent:''};
      return null;
    }
  };
  const listeners={};
  const document={
    visibilityState:'visible',
    querySelectorAll(selector){return selector==='[data-today-weather]'?[weatherNode]:[];},
    addEventListener(name,cb){listeners[name]=cb;},
    removeEventListener(name,cb){if(listeners[name]===cb)delete listeners[name];},
    createElement(tag){return {tag,classList:{add(){}},append(){},textContent:'',hidden:false};}
  };
  class FakeObserver{
    constructor(callback){this.callback=callback;observed.push(this);}
    observe(node){assert.equal(node,weatherNode);}
    disconnect(){}
  }
  const requests=[];
  const context={document,location:{pathname:'/today/'},
    IntersectionObserver:FakeObserver,Intl,URL,Date,AbortController,
    setTimeout,clearTimeout,fetch:async url=>{
      requests.push(url);
      return Response.json({status:'ok',temperatureC:16,city:'seoul',
        observationDate:'20261108',observationTime:'1200',
        retrievedAt:'2026-11-08T03:00:00Z',condition:'강수 관측 없음'});
    }
  };
  vm.runInNewContext(script,context);
  assert.equal(requests.length,0,'page entry must cost zero cold weather API requests');
  assert.equal(observed.length,1);
  observed[0].callback([{isIntersecting:false}]);
  assert.equal(requests.length,0,'below-fold widgets cannot fetch');
  document.visibilityState='hidden';
  observed[0].callback([{isIntersecting:true}]);
  assert.equal(requests.length,0,'background tab cannot fetch even if element intersects');
  document.visibilityState='visible';
  listeners.visibilitychange();
  await new Promise(resolve=>setTimeout(resolve,12));
  assert.equal(requests.length,1,'first visible use causes one call');
  observed[0].callback([{isIntersecting:true}]);
  assert.equal(requests.length,1,'repeat intersection cannot issue another call');
});
