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
test('general deals stay unchanged while unrelated food results fail closed',async()=>{
  await mockRequests(()=>[link('가리비 모양 쿠션',1)],async urls=>{
    const json=await(await onRequestGet(context(
      'https://life.example.com/deals/api?mode=search&q=%EA%B0%80%EB%A6%AC%EB%B9%84'
    ))).json();
    assert.equal(json.items.length,1,'general hot-deals search should not be changed');
    const other=await(await onRequestGet(context(
      'https://life.example.com/deals/api?mode=search&q='+encodeURIComponent('사과')+'&src=food'
    ))).json();
    assert.equal(other.items.length,0,'unrelated food recommendations now fail closed');
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

test('fresh oysters are shown but oyster sauce, cooked dishes, oyster croaker and tools are blocked',()=>{
  const allowed=['통영 생굴 1kg','국내산 손질 굴살 500g','냉동 석화 2kg','생굴 200g'];
  const denied=['굴소스 500g','굴비 2kg','굴전 밀키트 300g','굴모양 쿠션 1kg','굴 낚시 미끼 1kg','굴젓 500g','굴 전자책 3권'];
  for(const name of allowed)assert.equal(isRelevantFoodProduct('굴',name),true,name);
  for(const name of denied)assert.equal(isRelevantFoodProduct('굴',name),false,name);
});
test('fresh whole sweet persimmons are shown but processed persimmon desserts are blocked',()=>{
  const allowed=['국내산 단감 5kg','아삭한 태추단감 10과','제철 단감 5개','단감 1박스'];
  const denied=['단감말랭이 500g','곶감 1kg','단감 샐러드 밀키트 2개','단감 모양 쿠션 2개','단감 식초 1병','단감 전자책 1권','홍시 5kg'];
  for(const name of allowed)assert.equal(isRelevantFoodProduct('단감',name),true,name);
  for(const name of denied)assert.equal(isRelevantFoodProduct('단감',name),false,name);
});
test('new oyster and persimmon guide API queries use fresh-ingredient rules',async()=>{
  await mockRequests(()=>[link('국내산 생굴 500g',1),link('굴소스 500g',2)],async urls=>{
    const req=context('https://life.example.com/deals/api?mode=search&q='+encodeURIComponent('생굴')+'&src=food');
    const result=await(await onRequestGet(req)).json();
    assert.deepEqual(result.items.map(i=>i.title),['국내산 생굴 500g']);
    assert.equal(new URL(urls[0]).searchParams.get('limit'),'20');
  });
  await mockRequests(()=>[link('국내산 단감 10과',1),link('단감말랭이 1kg',2)],async urls=>{
    const req=context('https://life.example.com/deals/api?mode=search&q='+encodeURIComponent('단감')+'&src=food');
    const result=await(await onRequestGet(req)).json();
    assert.deepEqual(result.items.map(i=>i.title),['국내산 단감 10과']);
    assert.equal(urls.length,1);
  });
});

test('actual Adpick hot deal tour must not appear in fresh sweet-potato shopping',()=>{
  assert.equal(isRelevantFoodProduct('고구마','카호쿠 고구마 수확 &amp; E-바이크 컨트리사이드 투어'),false);
  assert.equal(isRelevantFoodProduct('고구마','해남산 생고구마 3kg'),true);
});

test('seasonal food keywords require an actual matching grocery, including one-letter produce',()=>{
  const matching=[
    ['시금치','국내산 시금치 1kg'],['봄동','국산 봄동 2kg'],
    ['귤','제주 감귤 5kg'],['쑥','냉장 쑥 500g'],
    ['딸기','산지직송 딸기 500g'],['달래','국산 달래 200g'],
    ['주꾸미','손질 주꾸미 1kg'],['오이','오이 3개'],
    ['완두콩','국내산 완두콩 500g'],['참외','참외 2kg'],
    ['감자','강원도 감자 5kg'],['매실','국내산 매실 3kg'],
    ['옥수수','국산 옥수수 5개'],['토마토','토마토 2kg'],
    ['가지','가지 3개'],['복숭아','복숭아 4개'],
    ['포도','포도 2kg'],['표고버섯','표고버섯 1kg'],
    ['사과','사과 3kg'],['배추','배추 3kg'],
    ['배','나주배 3kg']
  ];
  for(const [topic,title] of matching)
    assert.equal(isRelevantFoodProduct(topic,title),true,topic+' '+title);
  const wrong=[
    ['배','국산 배추 3kg'],['귤','귤맛 젤리 500g'],
    ['쑥','쑥떡 완제품 500g'],['딸기','딸기라떼 500ml'],
    ['배추','배추 모종 10개'],['사과','사과 모양 방향제 300g'],
    ['포도','포도맛 스낵 300g'],['시금치','시금치 크림 100g'],
    ['감자','감자 씨앗 5개'],['바나나','가리비 모양 쿠션 300g'],
    ['바나나','바나나 사탕 2kg']
  ];
  for(const [topic,title] of wrong)
    assert.equal(isRelevantFoodProduct(topic,title),false,topic+' '+title);
});

test('separate food intent: raw chicken, rice containers and recipe seasonings',()=>{
  for(const title of ['냉동밥 보관용기 10개','전자레인지 밥 소분용기 4개'])
    assert.equal(isRelevantFoodProduct('밥 소분용기',title),true,title);
  for(const title of ['즉석밥 10개','밥솥 1개','밥그릇 5개','밥 보관용기 쇼핑몰 이용권'])
    assert.equal(isRelevantFoodProduct('밥 소분용기',title),false,title);
  assert.equal(isRelevantFoodProduct('닭가슴살','국내산 생닭가슴살 1kg 냉동'),true);
  assert.equal(isRelevantFoodProduct('닭가슴살','수비드 닭가슴살 20팩'),false);
  assert.equal(isRelevantFoodProduct('닭가슴살','닭가슴살 소시지 10팩'),false);
  assert.equal(isRelevantFoodProduct('고춧가루','국산 고춧가루 1kg'),true);
  assert.equal(isRelevantFoodProduct('참기름','참기름 500ml'),true);
  assert.equal(isRelevantFoodProduct('고춧가루','고춧가루 모양 키링 5개'),false);
});

test('all food referrals use one provider call without broad fallback or caching',async()=>{
  const scenarios=[
    ['감귤',[link('제주 감귤 5kg',1),link('귤 모양 키링 2개',2)],['제주 감귤 5kg']],
    ['밥 소분용기',[link('밥솥 1개',3),link('냉동밥 보관용기 4개',4)],['냉동밥 보관용기 4개']],
    ['냉동 닭가슴살',[link('수비드 닭가슴살 20팩',5),link('생닭가슴살 1kg',6)],['생닭가슴살 1kg']],
    ['바나나',[link('가리비 모양 쿠션 2개',7),link('바나나 2kg',8)],['바나나 2kg']]
  ];
  for(const [query,items,expected] of scenarios){
    await mockRequests(()=>items,async urls=>{
      const req=context('https://life.example.com/deals/api?mode=search&q='
        +encodeURIComponent(query)+'&src=food');
      const response=await onRequestGet(req);
      const json=await response.json();
      assert.equal(response.status,200,query);
      assert.deepEqual(json.items.map(item=>item.title),expected,query);
      assert.equal(urls.length,1,query+' must use only one upstream request');
      assert.equal(new URL(urls[0]).searchParams.get('limit'),'10',query+' keeps bounded provider payload');
      assert.match(response.headers.get('cache-control'),/no-store/);
    });
  }
});
