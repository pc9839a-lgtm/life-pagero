import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/finance-live.js',import.meta.url),'utf8');

function mountRates(rows){
  const listeners={};
  let showMore;
  const make=(value='')=>({
    value,textContent:'',hidden:true,
    listeners:{},
    addEventListener(type,callback){this.listeners[type]=callback}
  });
  const products={
    _html:'',
    get innerHTML(){return this._html},
    set innerHTML(markup){this._html=markup},
    replaceChildren(){this._html=''},
    querySelector(selector){
      if(selector!=='.finance-mobile-rates-more' ||
         !this._html.includes('class="finance-mobile-rates-more"'))return null;
      return {addEventListener(type,callback){
        if(type==='click')showMore=callback;
      }};
    }
  };
  const elements=new Map([
    ['finance-products',products],
    ['finance-rate-panel',make()],
    ['finance-rates-official',make()],
    ['finance-product-criteria',make()],
    ['finance-products-source',make()],
    ['finance-kind',make('deposit')],
    ['finance-group',make('bank')],
    ['finance-term',make('12')],
    ['finance-sort',make('base')],
    ['finance-query',make('')],
    ['finance-initial-products',{
      textContent:JSON.stringify({retrievedAt:'2026-11-06T01:00:00Z',products:rows})
    }]
  ]);
  const document={getElementById:id=>elements.get(id)||null};
  vm.runInNewContext(source,{document,location:{pathname:'/finance/savings/'},
    Intl,Date,console,setTimeout,clearTimeout});
  return {elements,products,
    more:()=>{if(!showMore)throw Error('More button missing');showMore()},
    set(id,value,type='change'){
      const element=elements.get(id);element.value=value;
      element.listeners[type]();
    },
    countCards:()=>[...products.innerHTML.matchAll(/class="finance-mobile-rate-card"/g)].length,
    countRows:()=>[...products.innerHTML.matchAll(/<tr>/g)].length-1
  };
}
function fixture(count){
  return Array.from({length:count},(_,i)=>({
    bank:'가나다은행'+i,
    product:'정기적금 상품 '+i,
    joinWay:'온라인',
    term:12,
    baseRate:3+i/100,
    maxRate:4+i/100,
    preferential:i===0?'급여이체 및 자동이체':''
  }));
}
test('verified rates keep PC table and show only first 12 readable mobile cards',()=>{
  const ui=mountRates(fixture(25));
  assert.equal(ui.countRows(),25);
  assert.equal(ui.countCards(),12);
  assert.match(ui.products.innerHTML,/class="finance-mobile-rate-values"/);
  assert.match(ui.products.innerHTML,/기본금리/);
  assert.match(ui.products.innerHTML,/최고금리/);
  assert.match(ui.products.innerHTML,/더 보기 \(13건 남음\)/);
  assert.equal(ui.elements.get('finance-rate-panel').hidden,false);
  assert.equal(ui.elements.get('finance-rates-official').hidden,true);
});
test('mobile more button reveals only the next 12 without altering PC rows',()=>{
  const ui=mountRates(fixture(25));
  ui.more();
  assert.equal(ui.countCards(),24);
  assert.equal(ui.countRows(),25);
  assert.match(ui.products.innerHTML,/더 보기 \(1건 남음\)/);
  ui.more();
  assert.equal(ui.countCards(),25);
  assert.equal(ui.countRows(),25);
  assert.doesNotMatch(ui.products.innerHTML,/class="finance-mobile-rates-more"/);
});
test('existing keyword and term controls reset mobile pagination correctly',()=>{
  const ui=mountRates(fixture(25));
  ui.more();
  assert.equal(ui.countCards(),24);
  ui.set('finance-query','가나다은행1','input');
  assert.equal(ui.countCards(),11);
  assert.equal(ui.elements.get('finance-product-criteria').textContent.includes('11건'),true);
  ui.set('finance-term','6');
  assert.equal(ui.countCards(),0);
  assert.match(ui.products.innerHTML,/검색 결과가 없습니다/);
  ui.set('finance-term','12');
  assert.equal(ui.countCards(),11);
});
test('mobile product and bank values are escaped, rate values reflect API data',()=>{
  const rows=[{
    bank:'<img src=x onerror=alert(1)>',
    product:'<script>unsafe</script>',
    joinWay:'웹',
    term:12,
    baseRate:3.21,
    maxRate:4.19,
    preferential:'<b>특별조건</b>'
  }];
  const ui=mountRates(rows);
  assert.doesNotMatch(ui.products.innerHTML,/<script>unsafe<\/script>/);
  assert.match(ui.products.innerHTML,/&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.match(ui.products.innerHTML,/&lt;b&gt;특별조건&lt;\/b&gt;/);
  assert.match(ui.products.innerHTML,/3\.21%/);
  assert.match(ui.products.innerHTML,/4\.19%/);
});
