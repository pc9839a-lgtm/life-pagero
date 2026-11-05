import test from 'node:test';
import assert from 'node:assert/strict';
import {periodDates,isoDate,normalizeEvent,matches,classifyFee,regionOf,sortEvents} from './events-core.mjs';

test('KST week boundaries and tomorrow/weekend',()=>{
  assert.deepEqual(periodDates('this-week','2026-11-06'),{from:'2026-11-02',to:'2026-11-08'});
  assert.deepEqual(periodDates('this-week','2026-11-09'),{from:'2026-11-09',to:'2026-11-15'});
  assert.deepEqual(periodDates('weekend','2026-11-08'),{from:'2026-11-07',to:'2026-11-08'});
  assert.deepEqual(periodDates('tomorrow','2026-11-06'),{from:'2026-11-07',to:'2026-11-07'});
});
test('strict dates and ongoing overlap',()=>{
  assert.equal(isoDate('20260230'),null);
  assert.equal(isoDate('2026.11.06'),'2026-11-06');
  const e=normalizeEvent({source:'TOUR',sourceId:'1',title:'가을 축제',startDate:'20261020',endDate:'20261108',region:'경상북도'});
  assert.ok(e);
  assert.equal(e.region,'gyeongbuk');
  assert.equal(matches(e,{from:'2026-11-02',to:'2026-11-08',region:'all',category:'all',fee:'all',q:''}),true);
  assert.equal(matches(e,{from:'2026-11-09',to:'2026-11-15',region:'all',category:'all',fee:'all',q:''}),false);
});
test('free is not inferred from missing price and unknown image rights',()=>{
  const e=normalizeEvent({source:'KOPIS',sourceId:'PF1',title:'공연',startDate:'2026-11-01',endDate:'2026-11-30',feeText:'',imageUrl:'https://unknown/image.jpg',officialUrl:'http://invalid'});
  assert.equal(e.feeType,'unknown');
  assert.equal(e.imageUrl,null);
  assert.equal(e.officialUrl,null);
  assert.equal(classifyFee('입장 무료, 체험 유료'),'mixed');
});
test('stable source identities and deterministic order',()=>{
  const source={source:'TOUR',sourceId:'45',title:'행사',startDate:'2026-11-08',endDate:'2026-11-08'};
  assert.equal(normalizeEvent(source).id,normalizeEvent({...source,title:'명칭 수정'}).id);
  assert.equal(normalizeEvent({...source,startDate:'2026-11-09',endDate:'2026-11-08'}),null);
  assert.equal(regionOf('서울특별시 종로구'),'seoul');
  assert.equal(regionOf('경기도 광주시'),'gyeonggi');
  assert.equal(regionOf('광주광역시 동구'),'gwangju');
  assert.equal(sortEvents([{id:'b',title:'B',startDate:'2026-11-09',endDate:'2026-11-10'},{id:'a',title:'A',startDate:'2026-11-01',endDate:'2026-11-08'}],'2026-11-06')[0].id,'a');
});
