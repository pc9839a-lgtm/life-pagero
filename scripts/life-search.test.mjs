import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQuery,searchGuides,searchResultHref} from '../public/life-search-core.js';

const items=[
  {url:'/car/car-inspection-period/',title:'2026 자동차 검사기간 조회',description:'차종별 검사 유효기간과 검사방법',keywords:['검사기간']},
  {url:'/car/car-inspection-reservation/',title:'자동차 검사 예약 방법',description:'방문 예약 시 준비할 사항',keywords:['사이버검사소']},
  {url:'/support/housing-benefit-2026/',title:'2026 주거급여 대상·신청방법',description:'주거급여 소득기준',keywords:['임차급여']},
  {url:'/finance/loan-payment/',title:'대출 상환액 계산기',description:'매월 대출 상환액 확인',keywords:['대출 이자 계산','원리금 계산']},
  {url:'/finance/savings/',title:'금리 비교',description:'예금과 적금 금리 비교',keywords:['예금 금리 비교','금리비교']},
  {url:'/food/oyster/',title:'굴 보관법',description:'굴을 안전하게 보관하는 방법',keywords:['굴 손질']},
];

test('Korean spacing and punctuation variants normalize',()=>{
  assert.equal(normalizeQuery('  주거 · 급여  '),'주거 급여');
  assert.equal(normalizeQuery('  대출　이자   계산 '),'대출 이자 계산');
  assert.deepEqual(searchGuides(items,'주거 급여').map(x=>x.url),
    ['/support/housing-benefit-2026/']);
});

test('utility pages are searchable by actual task phrase and alias',()=>{
  const loans=searchGuides(items,'대출 이자 계산');
  assert.equal(loans[0]?.url,'/finance/loan-payment/');
  assert.equal(searchGuides(items,'금리비교')[0]?.url,'/finance/savings/');
});

test('exact title match has priority over generic description match',()=>{
  const chosen=searchGuides(items,'자동차 검사기간');
  assert.equal(chosen[0]?.url,'/car/car-inspection-period/');
});

test('no match, empty query and punctuation-only query return no results',()=>{
  assert.deepEqual(searchGuides(items,'매우 이상한 검색어'),[]);
  assert.deepEqual(searchGuides(items,'  '),[]);
  assert.deepEqual(searchGuides(items,'!!!'),[]);
});

test('duplicate records and dangerous offsite URLs are rejected',()=>{
  const unsafe=[
    {url:'javascript:alert(1)',title:'자동차 검사기간',description:'악성 링크',keywords:[]},
    {...items[0]},
    {...items[0]},
  ];
  assert.deepEqual(searchGuides(unsafe,'자동차 검사기간').map(x=>x.url),
    ['/car/car-inspection-period/']);
});

test('result order and count are stable',()=>{
  const first=searchGuides(items,'검사',1);
  assert.equal(first.length,1);
  assert.deepEqual(first,searchGuides(items.slice().reverse(),'검사',1));
});

test('canonical /life/ search results never jump to the pagero.kr site root',()=>{
  const asset='https://pagero.kr/life/life-search.js';
  for (const article of items) {
    const resolved=searchResultHref(article.url,asset);
    assert.equal(resolved,'https://pagero.kr/life'+article.url);
    assert.notEqual(resolved,'https://pagero.kr'+article.url);
  }
  assert.equal(searchResultHref('/finance/savings/',asset),
    'https://pagero.kr/life/finance/savings/');
  assert.equal(searchResultHref('/finance/savings/',asset+'?v=123'),
    'https://pagero.kr/life/finance/savings/');
});
test('preview and legacy standalone roots use their own base directory',()=>{
  assert.equal(searchResultHref('/support/housing-benefit-2026/',
    'https://life-pagero.pages.dev/life-search.js'),
    'https://life-pagero.pages.dev/support/housing-benefit-2026/');
  assert.equal(searchResultHref('/support/housing-benefit-2026/',
    'https://life.pagero.kr/life-search.js'),
    'https://life.pagero.kr/support/housing-benefit-2026/');
});
test('search destination resolver fails closed on traversal, external and malformed values',()=>{
  for(const candidate of [
    'https://example.net/', '//example.net/', '/../../admin/', '/foo?bar=1',
    'javascript:alert(1)', '/finance/loan-payment/#jump', null, '',
  ]) assert.throws(()=>searchResultHref(candidate,
    'https://pagero.kr/life/life-search.js'),/Invalid indexed destination/);
  assert.throws(()=>searchResultHref('/finance/','file:///life-search.js'),
    /Unsupported script origin/);
});


test('Pagero HTML/JSON proxy path rewriting must not double-prefix search links',()=>{
  // Pagero's functions/life/[[path]].js rewrites JSON quoted root paths.
  const originJson='{"url":"/finance/loan-payment/"}';
  const proxiedJson=originJson.replace(/(["'])\/(?!\/|life(?:\/|["']))/g,'$1/life/');
  const canonicalModule='https://pagero.kr/life/life-search.js';
  const raw=JSON.parse(originJson).url;
  const rewritten=JSON.parse(proxiedJson).url;
  assert.equal(raw,'/finance/loan-payment/');
  assert.equal(rewritten,'/life/finance/loan-payment/');
  assert.equal(searchResultHref(raw,canonicalModule),
    'https://pagero.kr/life/finance/loan-payment/');
  assert.equal(searchResultHref(rewritten,canonicalModule),
    'https://pagero.kr/life/finance/loan-payment/');
});
test('already-prefixed and raw index URLs resolve identically for all guides',()=>{
  const module='https://pagero.kr/life/life-search.js';
  for(const item of items){
    const raw=searchResultHref(item.url,module);
    const proxy=searchResultHref('/life'+item.url,module);
    assert.equal(raw,proxy,'Proxy must not duplicate prefix for '+item.url);
    assert.ok(raw.startsWith('https://pagero.kr/life/'));
    assert.doesNotMatch(proxy,/\/life\/life\//);
  }
  assert.throws(()=>searchResultHref('/life/life/car/foo/',module),
    /Duplicate site prefix/);
});
test('standalone pages keep their own root and module query strings do not matter',()=>{
  const canonicalModule='https://pagero.kr/life/life-search.js?v=20261117';
  const legacyModule='https://life-pagero.pages.dev/life-search.js';
  assert.equal(searchResultHref('/life/support/child-allowance-2026/',canonicalModule),
    'https://pagero.kr/life/support/child-allowance-2026/');
  assert.equal(searchResultHref('/support/child-allowance-2026/',legacyModule),
    'https://life-pagero.pages.dev/support/child-allowance-2026/');
});
