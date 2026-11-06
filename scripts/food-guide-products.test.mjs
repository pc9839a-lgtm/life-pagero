import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/food-guide-products.js',import.meta.url),'utf8');
const product=(title,link='https://link.adpick.co.kr/test')=>({
  title,price:12900,photo:'https://images.example.com/item.jpg',
  cp_name:'제휴 쇼핑몰',commissionlink:link
});
function domElement(tag='div'){
  return {
    tag,children:[],textContent:'',className:'',href:'',rel:'',target:'',
    append(...items){this.children.push(...items)},
    replaceChildren(...items){this.children=items},
  };
}
async function render({query='가리비',pathname='/life/food/scallops-clean-steam-storage/',
  response={ok:true,json:async()=>({status:'ok',items:[product('생가리비 1kg')]})}}={}){
  const results=domElement();
  const status=domElement();
  const root={
    dataset:{foodGuideProducts:query},
    querySelector:selector=>selector==='[data-food-shop-results]'?results:
      selector==='[data-food-shop-status]'?status:null
  };
  const fetches=[];
  const ctx={
    document:{
      querySelector:selector=>selector==='[data-food-guide-products]'?root:null,
      createElement:tag=>domElement(tag)
    },
    location:{pathname},
    URL,URLSearchParams,Intl,AbortController,
    setTimeout,clearTimeout,
    fetch:async(...args)=>{fetches.push(args);if(response instanceof Error)throw response;return response}
  };
  vm.runInNewContext(source,ctx);
  await new Promise(resolve=>setTimeout(resolve,15));
  return {results,status,fetches};
}
test('food guide loads server-side ADPICK search using food attribution and current proxy prefix',async()=>{
  const r=await render();
  assert.equal(r.fetches.length,1);
  const url=new URL(r.fetches[0][0],'https://pagero.kr');
  assert.equal(url.pathname,'/life/deals/api');
  assert.equal(url.searchParams.get('mode'),'search');
  assert.equal(url.searchParams.get('q'),'가리비');
  assert.equal(url.searchParams.get('src'),'food');
  assert.equal(r.fetches[0][1].cache,'no-store');
  assert.equal(r.results.children.length,1);
  const card=r.results.children[0];
  assert.equal(card.href,'https://link.adpick.co.kr/test');
  assert.equal(card.rel,'sponsored noopener noreferrer');
  assert.equal(card.target,'_blank');
  assert.equal(r.status.textContent,'1개 상품');
});
test('direct Pages origin uses non-prefixed API path and sweet-potato keyword',async()=>{
  const r=await render({query:'고구마',pathname:'/food/sweet-potato-storage-guide/'});
  const url=new URL(r.fetches[0][0],'https://life-pagero.pages.dev');
  assert.equal(url.pathname,'/deals/api');
  assert.equal(url.searchParams.get('q'),'고구마');
});
test('invalid HTTP affiliate links are ignored and only first four valid products appear',async()=>{
  const items=[product('위험','http://unsafe.example.com/p'),
    ...Array.from({length:10},(_,i)=>product('고구마 '+i,'https://link.adpick.co.kr/'+i))];
  const r=await render({query:'고구마',response:{ok:true,json:async()=>({status:'ok',items})}});
  assert.equal(r.results.children.length,4);
  assert.equal(r.status.textContent,'4개 상품');
});
test('failed or unconfigured API does not fabricate prices or shopping URLs',async()=>{
  const r=await render({response:{ok:false,status:503}});
  assert.equal(r.results.children.length,0);
  assert.equal(r.status.textContent,'상품을 불러오지 못했습니다.');
});
test('provider strings are treated as text, never inserted as HTML',async()=>{
  const r=await render({response:{ok:true,json:async()=>({status:'ok',items:[
    product('<script>alert(1)</script>')
  ]})}});
  const card=r.results.children[0];
  assert.equal(card.children[1].children[1].textContent,'<script>alert(1)</script>');
  assert.equal(card.children[1].children[0].tag,'span');
});
