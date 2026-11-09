import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/adpick-deals.js',import.meta.url),'utf8');
function element(tag='div'){
  const x={
    tagName:tag.toUpperCase(),children:[],events:{},hidden:false,
    textContent:'',className:'',dataset:{},
    setAttribute(name,value){this[name]=value;},
    addEventListener(name,callback){this.events[name]=callback;},
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=[...children];},
    get childElementCount(){return this.children.length;}
  };
  return x;
}
async function setup({visible=false,hidden=false,io=true,search='',pathname='/deals/',fetchHandler=null}={}){
  const target=element(),status=element(),tabs=element(),form=element('form'),panel=element('section');
  form.elements={q:{value:''}};
  form.reset=()=>{form.elements.q.value='';};
  const listeners={};
  const map={
    '[data-deals-list]':target,
    '[data-deals-status]':status,
    '[data-deals-filters]':tabs,
    '[data-deals-search]':form,
    '.adpick-products':panel
  };
  const document={
    visibilityState:hidden?'hidden':'visible',
    querySelector:q=>map[q]||null,createElement:element,
    addEventListener:(name,cb)=>{listeners[name]=cb;}
  };
  const observers=[];
  class FakeObserver{
    constructor(cb,options){this.cb=cb;this.options=options;observers.push(this);}
    observe(node){assert.equal(node,panel);}
    disconnect(){this.disconnected=true;}
  }
  const fetches=[];
  const fetch=async(url,options)=>{
    fetches.push({url:String(url),options});
    if(fetchHandler)return fetchHandler(url,options);
    return Response.json({status:'ok',items:[{
      title:'상품 A',price:12000,photo:'https://example.test/a.jpg',
      cp_name:'판매몰',commissionlink:'https://link.example.test/a'
    }]});
  };
  vm.runInNewContext(source,{
    document,location:{pathname,search},URL,URLSearchParams,
    AbortController,IntersectionObserver:io?FakeObserver:undefined,
    setTimeout,clearTimeout,fetch
  });
  const trigger=(ratio=0.2)=>{
    for(const observer of observers)
      if(!observer.disconnected)observer.cb([{isIntersecting:ratio>0,intersectionRatio:ratio}]);
  };
  const tab=area=>{
    const names=['today','popular','pick'];
    const index=names.indexOf(area);
    assert.ok(index>=0);
    tabs.children[index].events.click();
  };
  const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  if(visible)trigger();
  await settle(12);
  return {target,status,tabs,form,panel,fetches,trigger,tab,settle,document,listeners,observers};
}
test('just opening /deals/ has zero Adpick and Cloudflare Functions requests',async()=>{
  const s=await setup({visible:false});
  assert.equal(s.fetches.length,0);
  assert.match(s.status.textContent,/상품 영역이 보이면/);
  s.trigger(0.1);
  assert.equal(s.fetches.length,0);
  s.trigger(0.25);
  await s.settle(15);
  assert.equal(s.fetches.length,1);
  assert.equal(s.target.childElementCount,1);
  assert.match(s.fetches[0].url,/deals\/api\?/);
  s.trigger(1);
  s.tab('today');
  await s.settle(210);
  assert.equal(s.fetches.length,1,'same category and re-entry must not refetch');
});
test('background tabs do not call API; visible panel fetches once after focus',async()=>{
  const s=await setup({hidden:true,visible:true});
  assert.equal(s.fetches.length,0);
  s.document.visibilityState='visible';
  s.listeners.visibilitychange();
  await s.settle(15);
  assert.equal(s.fetches.length,1);
  s.listeners.visibilitychange();
  assert.equal(s.fetches.length,1);
});
test('fast category switching issues one request for the final selection',async()=>{
  const s=await setup();
  s.tab('popular');
  s.tab('pick');
  s.tab('today');
  assert.equal(s.fetches.length,0,'category debounce must prevent intermediate charges');
  await s.settle(235);
  assert.equal(s.fetches.length,1);
  assert.equal(new URL(s.fetches[0].url,'https://life.example').searchParams.get('area'),'today');
  assert.equal(s.target.childElementCount,1);
});
test('food-linked search is explicit and immediate; unconfigured browser fallback needs click',async()=>{
  const s=await setup({search:'?src=food',io:false});
  assert.equal(s.fetches.length,0);
  assert.equal(s.target.childElementCount,1);
  assert.equal(s.target.children[0].textContent,'상품 불러오기');
  s.form.elements.q.value='단감';
  s.form.events.submit({preventDefault(){}});
  await s.settle(15);
  assert.equal(s.fetches.length,1);
  const u=new URL(s.fetches[0].url,'https://life.example');
  assert.equal(u.searchParams.get('q'),'단감');
  assert.equal(u.searchParams.get('src'),'food');
});
test('invalid duplicate interactions do not spend another request',async()=>{
  const s=await setup({visible:true});
  assert.equal(s.fetches.length,1);
  s.tab('today');
  s.tab('today');
  s.trigger(1);
  await s.settle(200);
  assert.equal(s.fetches.length,1);
});
