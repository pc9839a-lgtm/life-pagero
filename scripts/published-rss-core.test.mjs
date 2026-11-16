import test from 'node:test';
import assert from 'node:assert/strict';
import {xmlEscape,collectPublishedFeedItems,renderRss,SITE} from './published-rss-core.mjs';

const posts=[
  {category:'car',slug:'car-inspection',title:'검사기간 & 예약 <안내>',
    description:'확인 방법과 예약 조건',publishedAt:'2026-07-18',updatedAt:'2026-11-15'},
  {category:'support',slug:'housing-benefit',title:'주거급여 2026',
    description:'대상·신청 방법',publishedAt:'2026-08-20',updatedAt:'2026-11-16'},
  {category:'support',slug:'noindex-excluded',title:'공개하지 않는 글',
    description:'검증 제외',publishedAt:'2026-10-01',noindex:true},
];
const food={
  publishedAt:'2026-11-06',
  guides:[
    {slug:'scallops',title:'가리비 손질·보관',description:'안전하게 조리하는 방법'},
    {slug:'oysters',title:'굴 씻기 "안전"',description:'보관·가열 & 안전',
      updatedAt:'2026-11-16',publishedAt:'2026-11-06'},
  ]
};

test('RSS item inventory includes core and food, excludes noindex and ranks modified date',()=>{
  const items=collectPublishedFeedItems(posts,food);
  assert.equal(items.length,4);
  assert.deepEqual(items.map(x=>x.url).sort(),[
    SITE+'/car/car-inspection/',SITE+'/food/oysters/',
    SITE+'/food/scallops/',SITE+'/support/housing-benefit/'
  ].sort());
  assert.equal(items[0].updatedAt,'2026-11-16');
});

test('RSS XML escapes titles and descriptions without unsafe CDATA',()=>{
  const rss=renderRss(collectPublishedFeedItems(posts,food));
  assert.match(rss,/검사기간 &amp; 예약 &lt;안내&gt;/);
  assert.match(rss,/굴 씻기 &quot;안전&quot;/);
  assert.match(rss,/보관·가열 &amp; 안전/);
  assert.doesNotMatch(rss,/<!\[CDATA\[/);
  assert.equal((rss.match(/<item>/g)||[]).length,4);
  assert.match(rss,/<atom:link href="https:\/\/pagero.kr\/life\/rss.xml" rel="self"/);
  assert.equal(xmlEscape("5 < 10 & 'safe'"),'5 &lt; 10 &amp; &apos;safe&apos;');
});

test('Original publication dates remain distinct from content modification dates',()=>{
  const rss=renderRss(collectPublishedFeedItems(posts,food));
  assert.match(rss,/<dcterms:issued>2026-07-18<\/dcterms:issued>/);
  assert.match(rss,/<dcterms:modified>2026-11-15<\/dcterms:modified>/);
  assert.match(rss,/<pubDate>Sat, 14 Nov 2026 15:00:00 GMT<\/pubDate>/);
});

test('Invalid dates, URLs, missing content, XML controls and duplicate slugs fail',()=>{
  assert.throws(()=>xmlEscape('broken\u0001character'),/control character/);
  assert.throws(()=>collectPublishedFeedItems(
    [{...posts[0],publishedAt:'2026-02-31'}],food),/Invalid calendar date/);
  assert.throws(()=>collectPublishedFeedItems(
    [{...posts[0],updatedAt:'2026-07-17'}],food),/Updated before published/);
  assert.throws(()=>collectPublishedFeedItems(
    [{...posts[0],slug:'../unsafe'}],food),/Unsafe article path/);
  assert.throws(()=>collectPublishedFeedItems(
    [posts[0],posts[0]],food),/Duplicate feed URL/);
  assert.throws(()=>renderRss([]),/empty feed/);
});
