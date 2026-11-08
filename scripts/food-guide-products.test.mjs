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
    events:{},attributes:{},
    append(...items){this.children.push(...items)},
    replaceChildren(...items){this.children=items},
    setAttribute(name,value){this.attributes[name]=value},
    addEventListener(type,fn){this.events[type]=fn}
  };
}
async function render({query='가리비',pathname='/life/food/scallops-clean-steam-storage/',
  response={ok:true,json:async()=>({status:'ok',items:[product('생가리비 1kg')]})},
  visible=true,observerSupported=true,visibilityState='visible'}={}){
  const results=domElement();
  const status=domElement();
  const retry=domElement('button');
  retry.hidden=true;
  const root={
    dataset:{foodGuideProducts:query},
    querySelector:selector=>selector==='[data-food-shop-results]'?results:
      selector==='[data-food-shop-status]'?status:
      selector==='[data-food-shop-retry]'?retry:null
  };
  const fetches=[];
  const listeners={};
  let observer;
  let disconnected=false;
  class FakeIntersectionObserver{
    constructor(callback,options){observer={callback,options};}
    observe(element){assert.equal(element,root);}
    disconnect(){disconnected=true;}
  }
  const document={
    querySelector:selector=>selector==='[data-food-guide-products]'?root:null,
    createElement:tag=>domElement(tag),
    visibilityState,
    addEventListener(type,callback){listeners[type]=callback}
  };
  const ctx={
    document,location:{pathname},
    URL,URLSearchParams,Intl,AbortController,
    IntersectionObserver:observerSupported?FakeIntersectionObserver:undefined,
    setTimeout,clearTimeout,
    fetch:async(...args)=>{fetches.push(args);if(response instanceof Error)throw response;return response}
  };
  vm.runInNewContext(source,ctx);
  const trigger=(ratio=1)=>{
    if(observer&&!disconnected)
      observer.callback([{isIntersecting:ratio>0,intersectionRatio:ratio}]);
  };
  if(visible)trigger();
  await new Promise(resolve=>setTimeout(resolve,15));
  return {
    results,status,fetches,retry,trigger,
    getObserver:()=>observer,
    setVisibilityState(state){
      document.visibilityState=state;
      listeners.visibilitychange?.();
    }
  };
}
test('food guide loads server-side ADPICK search using food attribution and current proxy prefix',async()=>{
  const r=await render();
  assert.equal(r.fetches.length,1);
  const url=new URL(r.fetches[0][0],'https://pagero.kr');
  assert.equal(url.pathname,'/life/deals/api');
  assert.equal(url.searchParams.get('mode'),'search');
  assert.equal(url.searchParams.get('q'),'홍가리비');
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
  assert.equal(r.status.textContent,'상품 조회에 실패했습니다.');
  assert.equal(r.retry.hidden,false);
});
test('provider KRW numeric strings display with comma and explicit 원 units',async()=>{
  const entries=[
    {...product('코스트코 가리비 관자 907g'),price:'108700'},
    {...product('국내산 홍가리비 2kg'),price:'29,900원'},
    {...product('손질 가리비살 500g'),price:9350},
    {...product('국내산 가리비 1kg'),price:null}
  ];
  const r=await render({response:{ok:true,json:async()=>({status:'ok',items:entries})}});
  assert.equal(r.results.children.length,4);
  const prices=r.results.children.map(card=>
    card.children[1].children[2].children[0].children[1].textContent);
  assert.deepEqual(prices,['108,700원','29,900원','9,350원','가격 확인']);
  for(const card of r.results.children){
    assert.equal(card.children[1].children[2].children[0].children[0].textContent,'판매가');
    assert.equal(card.children[1].children[2].children[1].textContent,'구매하기');
    assert.equal(card.attributes['aria-label'].endsWith('상품 확인'),true);
  }
});
test('broken external product image becomes neutral placeholder instead of broken icon',async()=>{
  const r=await render();
  const photo=r.results.children[0].children[0];
  assert.equal(photo.children[0].tag,'img');
  photo.children[0].events.error();
  assert.equal(photo.children.length,1);
  assert.equal(photo.children[0].className,'food-shop-photo-missing');
  assert.equal(photo.children[0].textContent,'상품 이미지 없음');
});
test('missing product thumbnail is replaced with static honest no-image label',async()=>{
  const entry={...product('생가리비 1kg'),photo:null,price:'27000'};
  const r=await render({response:{ok:true,json:async()=>({status:'ok',items:[entry]})}});
  assert.equal(r.results.children[0].children[0].children[0].textContent,'상품 이미지 없음');
  assert.equal(r.results.children[0].children[1].children[2].children[0].children[1].textContent,'27,000원');
});
test('provider strings are treated as text, never inserted as HTML',async()=>{
  const r=await render({response:{ok:true,json:async()=>({status:'ok',items:[
    product('<script>alert(1)</script>')
  ]})}});
  const card=r.results.children[0];
  assert.equal(card.children[1].children[1].textContent,'<script>alert(1)</script>');
  assert.equal(card.children[1].children[0].tag,'span');
});

test('failed live shop exposes manual reload without showing fake product cards',async()=>{
  const r=await render({response:{ok:false,status:500}});
  assert.equal(r.results.children.length,0);
  assert.equal(r.retry.hidden,false);
  assert.equal(typeof r.retry.events.click,'function');
  r.retry.events.click();
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.equal(r.fetches.length,2);
  assert.equal(r.retry.hidden,false);
});

test('article entry and offscreen scrolling never invoke Cloudflare Functions',async()=>{
  const r=await render({visible:false});
  assert.equal(r.fetches.length,0,'no request on opening the article');
  assert.equal(r.results.children.length,0);
  assert.match(r.status.textContent,/상품 영역/);
  assert.equal(r.retry.hidden,true);
  r.trigger(0);
  r.trigger(0.14);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(r.fetches.length,0,'offscreen/less than threshold must stay free');
  assert.equal(r.getObserver().options.rootMargin,'0px');
  assert.equal(r.getObserver().options.threshold,0.15);
  r.trigger(0.25);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(r.fetches.length,1,'one paid request only on visible content');
  r.trigger(1);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(r.fetches.length,1,'repeat intersection must not make paid requests');
});
test('background tabs never call the API before they become visible',async()=>{
  const r=await render({visible:true,visibilityState:'hidden'});
  assert.equal(r.fetches.length,0);
  r.setVisibilityState('visible');
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.equal(r.fetches.length,1);
  r.setVisibilityState('hidden');
  r.setVisibilityState('visible');
  assert.equal(r.fetches.length,1);
});
test('no IntersectionObserver falls back to explicit user-triggered loading',async()=>{
  const r=await render({observerSupported:false,visible:false});
  assert.equal(r.fetches.length,0);
  assert.equal(r.retry.hidden,false);
  assert.equal(r.retry.textContent,'상품 불러오기');
  r.retry.events.click();
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.equal(r.fetches.length,1);
  assert.equal(r.results.children.length,1);
});
test('loading state coalesces multiple manual taps into only one API request',async()=>{
  let finish;
  const response={ok:true,json:()=>new Promise(resolve=>{finish=resolve})};
  const r=await render({visible:false,response});
  r.trigger(1);
  assert.equal(r.fetches.length,1);
  r.retry.events.click();
  r.retry.events.click();
  assert.equal(r.fetches.length,1);
  // Let the async fetch continuation enter response.json() before resolving it.
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(typeof finish,'function');
  finish({status:'ok',items:[product('생가리비 1kg')]});
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.equal(r.results.children.length,1);
  assert.equal(r.fetches.length,1);
});
