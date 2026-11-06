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
  console.log('[today-first-fx] PASS: four real validated FX numbers in initial HTML, dated reference, no extra fetch, graceful source failure');
}finally{globalThis.fetch=realFetch;}
