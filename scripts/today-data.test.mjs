import assert from 'node:assert/strict';
import { onRequestGet as news } from '../functions/today/api/news.js';
import { onRequestGet as crypto } from '../functions/today/api/crypto.js';
import { onRequestGet as weather } from '../functions/today/api/weather.js';
import { onRequestGet as stocks } from '../functions/today/api/stocks.js';
import { onRequestGet as fx } from '../functions/today/api/fx.js';

const originalFetch=globalThis.fetch;
const ctx=(pathname,env={})=>({request:new Request('https://example.com'+pathname),env,
  waitUntil:()=>{}});
const response=(text,type='application/json')=>new Response(text,{
  status:200,headers:{'Content-Type':type}
});
try{
  let observedUrl='';
  globalThis.fetch=async url=>{
    observedUrl=String(url);
    return response(JSON.stringify([
      {market:'KRW-BTC',trade_price:100000000,signed_change_rate:0.02,
        acc_trade_price_24h:110000000000,timestamp:Date.now()},
      {market:'KRW-ETH',trade_price:4000000,signed_change_rate:-0.01,
        acc_trade_price_24h:65000000000,timestamp:Date.now()},
      {market:'KRW-XRP',trade_price:2500,signed_change_rate:0,
        acc_trade_price_24h:20000000000,timestamp:Date.now()},
      {market:'BTC-XRP',trade_price:0.00001,signed_change_rate:0,
        acc_trade_price_24h:100,timestamp:Date.now()}
    ]));
  };
  const quote=await crypto(ctx('/today/api/crypto')).then(r=>r.json());
  assert.equal(quote.status,'ok');assert.equal(quote.items.length,3);
  assert.equal(quote.items[0].market,'KRW-BTC');
  assert.equal(quote.items[1].changeRate,-0.01);
  assert(observedUrl.includes('api.upbit.com/v1/ticker/all'));
  globalThis.fetch=async url=>{
    const t=new URL(String(url));
    const city=t.searchParams.get('nx');
    assert.equal(city,'60');
    assert(t.searchParams.has('serviceKey'));
    return response(JSON.stringify({response:{
      header:{resultCode:'00'},
      body:{items:{item:[
        {category:'T1H',obsrValue:'13.2',baseDate:'20261105',baseTime:'1900'},
        {category:'PTY',obsrValue:'0'},
        {category:'REH',obsrValue:'54'},
        {category:'RN1',obsrValue:'0.0'}
      ]}}
    }}));
  };
  const noKey=await weather(ctx('/today/api/weather?city=seoul')).then(r=>r.json());
  assert.equal(noKey.status,'unconfigured');
  const observed=await weather(ctx('/today/api/weather?city=seoul',{KMA_SERVICE_KEY:'dummy'})).then(r=>r.json());
  assert.equal(observed.temperatureC,13.2);assert.equal(observed.humidityPercent,54);
  assert.equal(observed.condition,'강수 관측 없음');
  const badCity=await weather(ctx('/today/api/weather?city=unknown')).then(r=>r.json());
  assert.equal(badCity.status,'invalid');
  const published=new Date().toUTCString();
  globalThis.fetch=async url=>{
    const address=new URL(String(url));
    const host=address.hostname;
    const article=host==='www.yna.co.kr'?'https://www.yna.co.kr/view/AKR123':
      host==='newsis.com'?'https://newsis.com/view/NISX123':
      host==='www.mk.co.kr'?'https://www.mk.co.kr/news/123':
      'https://www.hani.co.kr/arti/123';
    const xml='<rss><channel><item><title><![CDATA[경제 주요 뉴스 제목]]></title>'+
      '<link>'+article+'</link><pubDate>'+published+'</pubDate>'+
      '<description>기사 본문을 서버가 복제하지 않아야 합니다.</description>'+
      '</item></channel></rss>';
    return response(xml,'application/rss+xml');
  };
  const headlines=await news(ctx('/today/api/news')).then(r=>r.json());
  assert.equal(headlines.status,'ok');assert(headlines.items.length>=1);
  assert.equal(typeof headlines.items[0].url,'string');
  assert(!JSON.stringify(headlines.items).includes('기사 본문을 서버가'));
  // Four KRW crosses must use the same ECB EUR reference date.
  globalThis.fetch=async url=>{
    assert.equal(String(url),
      'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=KRW,USD,JPY,CNY');
    return response(JSON.stringify({
      amount:1,base:'EUR',date:'2026-11-05',
      rates:{KRW:1680,USD:1.2,JPY:180,CNY:7.5}
    }));
  };
  const fxResponse=await fx(ctx('/today/api/fx'));
  const rates=await fxResponse.json();
  assert.equal(fxResponse.status,200);
  assert.equal(rates.status,'ok');
  assert.equal(rates.sourceDate,'2026-11-05');
  assert.equal(rates.items.length,4);
  assert.deepEqual(rates.items.map(row=>[row.code,row.unit]),
    [['USD',1],['JPY',100],['EUR',1],['CNY',1]]);
  assert.equal(rates.items[0].krw,1400);
  assert.equal(rates.items[1].krw,1680/180*100);
  assert.equal(rates.items[2].krw,1680);
  assert.equal(rates.items[3].krw,224);
  assert.equal(rates.delayed,true);
  assert(rates.note.includes('실시간'));
  // Incomplete or nonpositive upstream observations must never display 0 or guessed values.
  globalThis.fetch=async()=>response(JSON.stringify({
    amount:1,base:'EUR',date:'2026-11-05',
    rates:{KRW:1680,USD:1.2,JPY:0,CNY:7.5}
  }));
  const invalidFx=await fx(ctx('/today/api/fx'));
  const invalidFxBody=await invalidFx.json();
  assert.equal(invalidFx.status,502);
  assert.equal(invalidFxBody.status,'unavailable');
  assert(!('items' in invalidFxBody));
  const stock=await stocks(ctx('/today/api/stocks')).then(r=>r.json());
  assert.equal(stock.status,'unconfigured');
  assert.equal(stock.items.length,0);
  console.log('PASS: Upbit, KMA, RSS, four dated ECB FX KRW crosses, invalid FX refusal, KRX authorization gate');
}finally{
  globalThis.fetch=originalFetch;
}
