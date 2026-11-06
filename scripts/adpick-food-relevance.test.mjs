import assert from 'node:assert/strict';
import test from 'node:test';
import {isRelevantFoodProduct,onRequestGet} from '../functions/deals/api.js';

const link=(title,id)=>({
  title,price:17800,photo:'https://example.com/p.jpg',
  cp_name:'제휴몰',commissionlink:'https://link.adpick.co.kr/item'+id
});
const irrelevantScallops=[
 '알리익스프레스 14개 세트 해수용 낚시 미끼 오징어 가리비',
 '[오이스터바] YOSHI 굴·가리비 화로구이+와규 코스',
 '[멜착커버] 킬커버 파운웨어 쿠션',
 '나가노현 마쓰모토시 가리비 [좌석 예약 전용]',
 '가리비 모양 액세서리 50g',
 '가리비 목걸이 10g',
 '가리비 접시 2개입',
 '가리비 찜기 1개'
];
const relevantScallops=[
 '국내산 홍가리비 2kg 산지직송',
 '생물 가리비 1kg',
 '냉동 손질 가리비살 500g',
 '신선한 비단가리비 관자 1kg'
];
const irrelevantPotatoes=[
 '고구마 모종 3개',
 '고구마 말랭이 500g',
 '고구마 맛 스낵 200g',
 '고구마 라떼 2잔',
 '고구마 모양 쿠션 1개',
 '고구마 씨앗 2봉',
 '고구마 케이크 1kg',
 '고구마 분말 1kg'
];
const relevantPotatoes=[
 '국내산 햇고구마 5kg',
 '산지직송 꿀고구마 3kg',
 '못난이 밤고구마 10kg',
 '신선한 무세척 호박고구마 1kg'
];
test('four screenshot-like unrelated scallop offers and more are rejected',()=>{
  for(const title of irrelevantScallops)
    assert.equal(isRelevantFoodProduct('가리비',title),false,title);
  for(const title of relevantScallops)
    assert.equal(isRelevantFoodProduct('가리비',title),true,title);
});
test('only fresh sweet potato ingredients, not snacks, seedlings or cosmetics',()=>{
  for(const title of irrelevantPotatoes)
    assert.equal(isRelevantFoodProduct('고구마',title),false,title);
  for(const title of relevantPotatoes)
    assert.equal(isRelevantFoodProduct('고구마',title),true,title);
});
test('no vague matches, invalid titles or mismatched guide keywords',()=>{
  for(const title of ['',null,undefined,'쇼핑 모음 1kg'])
    assert.equal(isRelevantFoodProduct('가리비',title),false);
  assert.equal(isRelevantFoodProduct('가리비','산지직송 밤고구마 3kg'),false);
  assert.equal(isRelevantFoodProduct('고구마','생물 홍가리비 1kg'),false);
});
const context=(url='https://life.example.com/deals/api?mode=search&q=%EA%B0%80%EB%A6%AC%EB%B9%84&src=food')=>({
  request:new Request(url),
  env:{ADPICK_BIZ_API_KEY:'placeholder-key'}
});
async function mockRequests(resolver,run){
  const original=globalThis.fetch;
  const urls=[];
  try{
    globalThis.fetch=async url=>{
      const href=String(url);
      urls.push(href);
      const payload=resolver(new URL(href));
      return new Response(JSON.stringify({success:true,data:payload}),{status:200,
        headers:{'Content-Type':'application/json'}});
    };
    return await run(urls);
  }finally{globalThis.fetch=original;}
}
test('ingredient API rejects irrelevant items even when Adpick search returns them',async()=>{
  await mockRequests(()=>[
    ...irrelevantScallops.map((title,i)=>link(title,i)),
    ...relevantScallops.slice(0,2).map((title,i)=>link(title,100+i))
  ],async urls=>{
    const response=await onRequestGet(context());
    const json=await response.json();
    assert.equal(response.status,200);
    assert.equal(json.items.length,2);
    assert.deepEqual(json.items.map(x=>x.title),relevantScallops.slice(0,2));
    assert.equal(urls.length,1);
    assert.ok(urls[0].includes('p_data=life_food_search'));
    assert.match(response.headers.get('cache-control'),/no-store/);
  });
});
test('one narrower query is tried when all broad hits are unrelated',async()=>{
  await mockRequests(url=>{
    if(url.searchParams.get('q')==='가리비')return irrelevantScallops.map((x,i)=>link(x,i));
    if(url.searchParams.get('q')==='홍가리비')return [
      link('홍가리비 낚시 미끼 3개',200),
      link('국내산 홍가리비 2kg',201)
    ];
    return [];
  },async urls=>{
    const json=await (await onRequestGet(context())).json();
    assert.equal(json.items.length,1);
    assert.equal(json.items[0].title,'국내산 홍가리비 2kg');
    assert.equal(json.items[0].commissionlink,'https://link.adpick.co.kr/item201');
    assert.deepEqual(urls.map(x=>new URL(x).searchParams.get('q')),['가리비','홍가리비']);
  });
});
test('no approved ingredients -> zero products; never fall back to ads for cosmetics or restaurants',async()=>{
  await mockRequests(()=>irrelevantScallops.map((t,i)=>link(t,i)),async urls=>{
    const response=await onRequestGet(context());
    const json=await response.json();
    assert.equal(json.status,'ok');
    assert.deepEqual(json.items,[]);
    assert.equal(urls.length,2);
  });
});
test('sweet potato page excludes snacks and only returns real sweet potatoes',async()=>{
  await mockRequests(()=>[
    ...irrelevantPotatoes.slice(0,4).map((x,i)=>link(x,i)),
    link('국내산 꿀고구마 3kg',98)
  ],async urls=>{
    const url='https://life.example.com/deals/api?mode=search&q=%EA%B3%A0%EA%B5%AC%EB%A7%88&src=food';
    const json=await (await onRequestGet(context(url))).json();
    assert.deepEqual(json.items.map(x=>x.title),['국내산 꿀고구마 3kg']);
    assert.equal(urls.length,1);
  });
});
test('general hot deals and other food searches preserve existing behavior',async()=>{
  await mockRequests(()=>[link('가리비 모양 쿠션',1)],async urls=>{
    const json=await(await onRequestGet(context(
      'https://life.example.com/deals/api?mode=search&q=%EA%B0%80%EB%A6%AC%EB%B9%84'
    ))).json();
    assert.equal(json.items.length,1,'general hot-deals search should not be changed');
    const other=await(await onRequestGet(context(
      'https://life.example.com/deals/api?mode=search&q=%EC%82%BC%EC%B9%98&src=food'
    ))).json();
    assert.equal(other.items.length,1,'unrelated food search behavior preserved');
    assert.equal(urls.length,2);
  });
});
