import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/today/[[path]].js';

const original=fs.readFileSync(path.resolve('dist/today/index.html'),'utf8');
const realFetch=globalThis.fetch;
const jsonPayload={
  amount:1,base:'EUR',date:'2026-11-05',
  rates:{KRW:1680,USD:1.2,JPY:180,CNY:7.5}
};
const context=pathname=>({
  request:new Request('https://pagero.kr'+pathname),
  env:{},waitUntil:()=>{},
  next:async()=>new Response(original,{
    headers:{'content-type':'text/html; charset=utf-8'}
  })
});
try {
  globalThis.fetch=async url=>{
    assert.equal(String(url),
      'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=KRW,USD,JPY,CNY');
    return Response.json(jsonPayload);
  };
  const response=await onRequestGet(context('/today/'));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-life-today-initial-fx'),'verified');
  const html=await response.text();
  assert.equal((html.match(/class="today-fx-value"/g)||[]).length,4);
  assert.equal((html.match(/data-fx-preloaded="true"/g)||[]).length,1);
  assert.ok(html.includes('1 USD'));
  assert.ok(html.includes('100 JPY'));
  assert.ok(html.includes('1 EUR'));
  assert.ok(html.includes('1 CNY'));
  for(const amount of ['1,400.00원','933.33원','1,680.00원','224.00원'])
    assert.ok(html.includes(amount),'initial visible FX amount missing: '+amount);
  assert.ok(html.includes('ECB 참고환율 · 2026-11-05 기준'));
  assert.equal((html.match(/<link rel="canonical"/g)||[]).length,1);
  assert.equal((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length,1);
  assert.ok(!html.includes('<script type="application/json" id="fx-secret"'));
  const before=await onRequestGet(context('/finance/markets/'));
  assert.equal(await before.text(),original,'unrelated finance page should pass through');
  globalThis.fetch=async()=>Response.json({
    amount:1,base:'EUR',date:'2026-11-05',
    rates:{KRW:1680,USD:1.2,JPY:0,CNY:7.5}
  });
  const failed=await onRequestGet(context('/today/'));
  assert.equal(failed.headers.get('x-life-today-initial-fx'),null);
  assert.equal(await failed.text(),original,
    'bad FX source must not render invented values');
  // Cache-warm visitors receive weather, headlines and crypto in the very
  // first HTML with no additional upstream calls; cold visitors still fall
  // back to the regular dedicated API endpoints.
  const oldCaches=globalThis.caches;
  let upstream=0;
  const recent='2026-11-05T10:00:00.000Z';
  const fixtures={
    'fx-ecb-krw-reference__fresh':{
      status:'ok',retrievedAt:recent,sourceDate:'2026-11-05',
      items:[
        {code:'USD',name:'미국 달러',unit:1,krw:1400},
        {code:'JPY',name:'일본 엔',unit:100,krw:933.333333},
        {code:'EUR',name:'유로',unit:1,krw:1680},
        {code:'CNY',name:'중국 위안',unit:1,krw:224}
      ]
    },
    'weather-seoul__fresh':{
      status:'ok',retrievedAt:recent,city:'seoul',temperatureC:14.2,
      humidityPercent:50,precipitationMm:0,condition:'강수 관측 없음',
      observationDate:'20261105',observationTime:'1900'
    },
    'news-headlines__fresh':{
      status:'ok',retrievedAt:recent,items:[{
        title:'물가·생활 관련 주요뉴스',source:'연합뉴스',category:'경제',
        publishedAt:recent,url:'https://www.yna.co.kr/view/AKR123'
      },{
        title:'<img src=x onerror=alert(1)>',source:'뉴시스',category:'전체',
        publishedAt:recent,url:'https://www.newsis.com/view/NISX123'
      }]
    },
    'crypto-top-krw__fresh':{
      status:'ok',retrievedAt:recent,items:[
        {market:'KRW-BTC',name:'비트코인',code:'BTC',price:91000000,changeRate:0.02},
        {market:'KRW-ETH',name:'이더리움',code:'ETH',price:3200000,changeRate:-0.01},
        {market:'KRW-XRP',name:'리플',code:'XRP',price:3200,changeRate:0}
      ]
    }
  };
  globalThis.caches={default:{
    async match(req){
      const key=String(req.url).split('/').pop();
      return Object.hasOwn(fixtures,key)?Response.json(fixtures[key]):undefined;
    },
    async put(){throw Error('Warm data should not write new cache entries');}
  }};
  globalThis.fetch=async()=>{upstream++;throw Error('UNEXPECTED_UPSTREAM_REQUEST');};
  try{
    const warmResponse=await onRequestGet(context('/today/'));
    assert.equal(warmResponse.status,200);
    assert.equal(warmResponse.headers.get('x-life-today-initial-fx'),'verified');
    assert.equal(warmResponse.headers.get('x-life-today-warm-snapshots'),'verified');
    const warmHtml=await warmResponse.text();
    for(const marker of [
      'data-fx-preloaded="true"',
      'data-weather-preloaded="true"',
      'data-news-preloaded="true"',
      'data-crypto-preloaded="true"',
      'data-today-news-seed',
      'data-today-crypto-seed',
      '14.2°',
      '습도 50%',
      '물가·생활 관련 주요뉴스',
      '91,000,000원',
      '1,400.00원'
    ])assert.ok(warmHtml.includes(marker),'Server warm snapshot missing '+marker);
    assert.ok(warmHtml.includes('&lt;img src=x onerror=alert(1)&gt;'),
      'Cached headlines must escape HTML');
    assert.ok(!warmHtml.includes('<img src=x onerror=alert(1)>'),
      'Untrusted headline must never produce executable HTML');
    assert.equal(upstream,0,'Warm page cannot call upstream FX/crypto/news/weather');

    const partial={...fixtures};
    delete partial['weather-seoul__fresh'];
    globalThis.caches={default:{
      async match(req){
        const key=String(req.url).split('/').pop();
        return Object.hasOwn(partial,key)?Response.json(partial[key]):undefined;
      },
      async put(){throw Error('Partial warm should not write');}
    }};
    const mixed=await onRequestGet(context('/today/'));
    const mixedHtml=await mixed.text();
    assert.ok(!mixedHtml.includes('data-weather-preloaded="true"'),
      'Cold weather must keep its dedicated browser API fallback');
    assert.ok(mixedHtml.includes('data-news-preloaded="true"'),
      'Warm news must still preload when weather cache is cold');
    assert.equal(upstream,0);
  }finally{
    if(oldCaches===undefined)delete globalThis.caches;
    else globalThis.caches=oldCaches;
  }
  console.log('[today-first-fx] PASS: four real validated FX numbers in initial HTML, dated reference, no extra fetch, graceful source failure');
}finally{globalThis.fetch=realFetch;}
