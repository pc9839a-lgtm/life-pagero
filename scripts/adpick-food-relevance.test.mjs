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
 '가리비 찜기 1개',
 '[eBook] 진주 조개 마을의 작은 가리비',
 '[기프트] 홍 가리비 1kg 20미 내외',
 '맘마밀 안심이유식 12개월 가리비와 두부 100g, 10개',
 '[보리보리] 오너클랜 키조개 손질칼 1p 키조개 가리비 어패류 전용칼'
];
const relevantScallops=[
 '국내산 홍가리비 2kg 산지직송',
 '생물 가리비 1kg',
 '냉동 손질 가리비살 500g',
 '신선한 비단가리비 관자 1kg',
 '코스트코 가리비 관자 907g'
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
test('narrow scallop lookup uses one upstream request and filters invalid inventory',async()=>{
  await mockRequests(url=>[
    link('홍가리비 낚시 미끼 3개',200),
    link('국내산 홍가리비 2kg',201)
  ],async urls=>{
    const url='https://life.example.com/deals/api?mode=search&q=%ED%99%8D%EA%B0%80%EB%A6%AC%EB%B9%84&src=food';
    const json=await(await onRequestGet(context(url))).json();
    assert.equal(json.items.length,1);
    assert.equal(json.items[0].title,'국내산 홍가리비 2kg');
    assert.deepEqual(urls.map(u=>new URL(u).searchParams.get('q')),['홍가리비']);
    assert.equal(new URL(urls[0]).searchParams.get('limit'),'20');
  });
});
test('no matching products returns empty in one query; no double latency penalty',async()=>{
  await mockRequests(()=>irrelevantScallops.map((t,i)=>link(t,i)),async urls=>{
    const url='https://life.example.com/deals/api?mode=search&q=%ED%99%8D%EA%B0%80%EB%A6%AC%EB%B9%84&src=food';
    const json=await(await onRequestGet(context(url))).json();
    assert.equal(json.status,'ok');
    assert.deepEqual(json.items,[]);
    assert.equal(urls.length,1);
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


test('samchi product search only admits fresh, uncooked seafood',()=>{
  const allowed=['국내산 손질 삼치 500g','냉동 순살 삼치 1kg',
    '구이용 생삼치 2마리','삼치 500g'];
  const denied=['삼치구이 밀키트 2개','삼치조림 300g','삼치 낚시 미끼 1kg',
    '삼치 모양 쿠션 2개','삼치 양념 조리완료 500g','삼치 전자책 1kg'];
  for(const name of allowed)assert.equal(isRelevantFoodProduct('삼치',name),true,name);
  for(const name of denied)assert.equal(isRelevantFoodProduct('삼치',name),false,name);
});
test('autumn radish filter accepts raw radish but not pickles and prepared foods',()=>{
  const allowed=['국내산 가을무 5kg','김장무 10kg 산지직송',
    '가을무 3개 묶음','제주 월동무 5kg'];
  const denied=['가을무 깍두기 5kg','동치미 가을무 2kg',
    '국산 무말랭이 1kg','무선 청소기 2kg','가을무 모종 5개',
    '고구마 5kg','무김치 5kg','가을무 전자책 1권'];
  for(const name of allowed)assert.equal(isRelevantFoodProduct('무',name),true,name);
  for(const name of denied)assert.equal(isRelevantFoodProduct('무',name),false,name);
});
test('new food pages pass through server-side topic validation',async()=>{
  await mockRequests(()=>[
    link('국내산 손질 삼치 500g',1),link('삼치구이 밀키트 300g',2)
  ],async urls=>{
    const req=context('https://life.example.com/deals/api?mode=search&q='+encodeURIComponent('삼치')+'&src=food');
    const result=await (await onRequestGet(req)).json();
    assert.deepEqual(result.items.map(i=>i.title),['국내산 손질 삼치 500g']);
    assert.equal(new URL(urls[0]).searchParams.get('limit'),'20');
  });
  await mockRequests(()=>[
    link('국내산 가을무 5kg',1),link('가을무 깍두기 5kg',2)
  ],async urls=>{
    const req=context('https://life.example.com/deals/api?mode=search&q='+encodeURIComponent('가을무')+'&src=food');
    const result=await (await onRequestGet(req)).json();
    assert.deepEqual(result.items.map(i=>i.title),['국내산 가을무 5kg']);
    assert.equal(urls.length,1);
  });
});
