import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/finance/[[path]].js';

const DIST=path.resolve('dist');
const origin='https://life-pagero.pages.dev';
const sample=[
  {id:'A',bank:'금리검증은행A',product:'검증용 예금 A',term:12,baseRate:3.35,maxRate:3.65},
  {id:'B',bank:'금리검증은행B',product:'검증용 예금 B',term:12,baseRate:3.25,maxRate:3.55},
  {id:'C',bank:'금리검증은행C',product:'검증용 예금 C',term:12,baseRate:3.15,maxRate:3.45}
];
const realFetch=globalThis.fetch;
const out=sample.map(x=>({
  fin_co_no:x.id,fin_prdt_cd:'fixed',kor_co_nm:x.bank,
  fin_prdt_nm:x.product,join_way:'온라인',spcl_cnd:'조건 테스트'
}));
const options=sample.map(x=>({
  fin_co_no:x.id,fin_prdt_cd:'fixed',save_trm:'12',
  intr_rate:String(x.baseRate),intr_rate2:String(x.maxRate),intr_rate_type:'S',
  intr_rate_type_nm:'단리',rsrv_type:'',rsrv_type_nm:''
}));
globalThis.fetch=async input=>{
  if(!String(input).startsWith('https://finlife.fss.or.kr/finlifeapi/'))throw Error('Unexpected external request: '+input);
  return Response.json({result:{err_cd:'000',max_page_no:1,baseList:out,optionList:options}});
};
const pageFile=pathname=>pathname==='/finance'?'finance/index.html':'finance/savings/index.html';
const staticPage=pathname=>fs.readFileSync(path.join(DIST,pageFile(pathname)),'utf8');
const createContext=(pathname,secret='development-only-example')=>({
  env:secret?{FSS_API_KEY:secret}:{},
  request:new Request(origin+pathname+'/'),
  waitUntil:()=>{},
  next:async()=>new Response(staticPage(pathname),{
    headers:{'content-type':'text/html; charset=utf-8'}
  })
});
try{
  for(const pathname of ['/finance','/finance/savings']){
    const before=staticPage(pathname);
    const res=await onRequestGet(createContext(pathname));
    assert.equal(res.status,200,pathname+' status');
    assert.equal(res.headers.get('x-life-finance-initial-rates'),'verified',pathname+' header');
    const body=await res.text();
    assert.equal((body.match(/<link rel="canonical"/g)||[]).length,1);
    for(const token of ['금리검증은행A','금리검증은행B','3.35%','3.25%']){
      assert.ok(body.includes(token),pathname+' actual HTML rate missing '+token);
    }
    assert.ok(!body.includes('development-only-example'),'Secret leaked in '+pathname);
    if(pathname==='/finance'){
      assert.ok(body.includes('id="finance-rate-preview" data-preloaded="true"'));
      assert.ok(body.includes('class="finance-preview-card"'));
      assert.ok(!body.includes('id="finance-rate-preview" hidden'));
    }else{
      assert.ok(body.includes('id="finance-rate-panel" aria-labelledby="bank-rates-heading">'));
      assert.ok(!body.includes('id="finance-rate-panel" aria-labelledby="bank-rates-heading" hidden'));
      assert.equal((body.match(/<tr><td><strong>/g)||[]).length,3);
      assert.ok(body.includes('id="finance-initial-products"'));
      assert.ok(body.includes('class="finance-rate-table"'));
    }
    const fallback=await onRequestGet(createContext(pathname,null));
    assert.equal(fallback.headers.get('x-life-finance-initial-rates'),null);
    assert.equal(await fallback.text(),before);
  }
  console.log('[server-initial-rates] PASS: full FSS numeric values visible in initial HTML on overview and savings, correctly hidden without verified data, secrets never exposed.');
}finally{globalThis.fetch=realFetch;}
