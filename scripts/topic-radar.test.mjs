import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,tokenOverlap,scoreItem} from './topic-radar.mjs';

test('RSS text and links are extracted',()=>{
  const xml='<?xml version="1.0"?><rss><channel><item><title><![CDATA[2026 대출 &amp; 금리]]></title><link>http://kosis.kr/item?a=1&amp;b=2</link><description><![CDATA[<p>대출 변경</p>]]></description><pubDate>Thu, 05 Nov 2026 00:00:00 GMT</pubDate></item></channel></rss>';
  const items=parseFeed(xml);
  assert.equal(items.length,1);
  assert.equal(items[0].title,'2026 대출 & 금리');
  assert.equal(items[0].link,'http://kosis.kr/item?a=1&b=2');
  assert.equal(items[0].description,'대출 변경');
});
test('Atom feed href is recognized',()=>{
  const xml='<feed><entry><title>주택 대출 변경</title><link href="https://fsc.go.kr/policy"/><updated>2026-11-05T01:00:00Z</updated></entry></feed>';
  assert.equal(parseFeed(xml)[0].link,'https://fsc.go.kr/policy');
});
test('Exact existing questions are not republished as new pages',()=>{
  const groups=[{id:'finance',label:'대출·신용',risk:'high',keywords:['대출','금리']}];
  const item={title:'대출 상환 금리 변경',description:'대출 금리 대상',publishedAt:'2026-11-05',link:'https://fsc.go.kr/policy',source:'금융위원회'};
  const now=new Date('2026-11-05T12:00:00Z');
  assert.equal(scoreItem(item,groups,[{title:'대출 상환 금리 변경'}],now),null);
  const scored=scoreItem(item,groups,[],now);
  assert.ok(scored.score>0);
  assert.equal(scored.verified,false);
  assert.equal(scored.risk,'high');
});
test('Old and unrelated releases are filtered',()=>{
  const groups=[{id:'finance',label:'대출·신용',risk:'high',keywords:['대출']}];
  const now=new Date('2026-11-05T12:00:00Z');
  assert.equal(scoreItem({title:'대출 금리 조정',publishedAt:'2025-01-01'},groups,[],now),null);
  assert.equal(scoreItem({title:'연예인 콘서트',publishedAt:'2026-11-05'},groups,[],now),null);
  assert.ok(tokenOverlap('대출 이자 비교','대출 이자')>0);
});
test('KOSIS generic statistical titles never become editorial article candidates',()=>{
  const groups=[{id:'welfare',label:'정부지원·복지',risk:'high',keywords:['지원금','복지','기초생활']}];
  const now=new Date('2026-11-05T12:00:00Z');
  assert.equal(scoreItem({
    title:'부산광역시금정구기본통계 ( 64 )',
    description:'복지 지원금 지표를 포함한 2026 통계',
    publishedAt:'2026-11-05',
  },groups,[],now),null);
});

test('Event promotion and government research procurement are not SEO topic candidates',()=>{
  const now=new Date('2026-11-05T12:00:00Z');
  const welfare=[{id:'welfare',label:'정부지원·복지',risk:'high',keywords:['복지','지원금']}];
  assert.equal(scoreItem({title:'복지관 야간 운영과 지역 축제',description:'지원금 안내',publishedAt:'2026-11-05'},welfare,[],now),null);
  const employment=[{id:'employment',label:'근로·퇴직',risk:'high',keywords:['근로','퇴직']}];
  assert.equal(scoreItem({title:'공무직 근로자 정책연구과제 실태조사',description:'지원금',publishedAt:'2026-11-05'},employment,[],now),null);
});
test('Local tax refunds and voucher reimbursements remain eligible',()=>{
  const groups=[
    {id:'tax',label:'세금·환급금',risk:'high',keywords:['지방세','환급금','세금']},
    {id:'shopping',label:'쇼핑·소비혜택',risk:'low',keywords:['상품권','지역화폐']},
  ];
  const now=new Date('2026-11-05T12:00:00Z');
  const a=scoreItem({title:'11월 지방세 환급금 신청',publishedAt:'2026-11-05'},groups,[],now);
  const b=scoreItem({title:'서울사랑상품권 5% 환급',publishedAt:'2026-11-05'},groups,[],now);
  assert.equal(a.categoryId,'tax');assert.equal(b.categoryId,'shopping');
});

test('Personal rehabilitation topics can be reviewed without activating CPA leads',()=>{
  const groups=[{id:'debt-relief',label:'개인회생·채무조정',risk:'high',keywords:['개인회생','개인파산','채무조정']}];
  const scored=scoreItem({title:'개인회생 신청 자격과 변제계획',publishedAt:'2026-11-05'},groups,[],new Date('2026-11-05T12:00:00Z'));
  assert.ok(scored);
  assert.equal(scored.categoryId,'debt-relief');
  assert.equal(scored.verified,false);
  assert.equal(scored.risk,'high');
});
