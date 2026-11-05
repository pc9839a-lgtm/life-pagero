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