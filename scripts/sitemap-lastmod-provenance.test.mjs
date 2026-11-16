import test from 'node:test';
import assert from 'node:assert/strict';
import {dateMapForSitemap,updateSitemapDates} from './sitemap-lastmod-provenance.mjs';

const posts=Array.from({length:48},(_,i)=>({
  category:i<15?'car':'support',
  slug:'guide-'+i,
  updatedAt:i===47?'2026-11-16':i<15?'2026-10-03':'2026-11-07',
}));
const foodGuides={publishedAt:'2026-11-06',
  guides:Array.from({length:14},(_,i)=>({slug:'food-'+i,
    ...(i===5?{updatedAt:'2026-11-12'}:{})}))};
const policy='<p>작성·검수 기준 확인일: 2026-10-23</p>';
const dates=dateMapForSitemap(posts,foodGuides,policy);
const routes=['/','/car/','/support/','/about/','/privacy-policy/','/contact/',
  '/today/','/finance/','/finance/loan-payment/','/topics/','/food/',
  '/editorial-standards/','/deals/','/tools/car-cost/',
  ...posts.map(p=>'/'+p.category+'/'+p.slug+'/'),
  ...foodGuides.guides.map(p=>'/food/'+p.slug+'/')];
const raw='<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  +routes.map(route=>'<url><loc>https://pagero.kr/life'+route+
    '</loc><lastmod>2026-11-16</lastmod></url>').join('')+'</urlset>';

test('category dates use their own articles, not latest update anywhere',()=>{
  assert.equal(dates.get('/car/'),'2026-10-03');
  assert.equal(dates.get('/support/'),'2026-11-16');
  assert.equal(dates.get('/support/guide-47/'),'2026-11-16');
});

test('food dates follow each guide data, policy follows visible date',()=>{
  assert.equal(dates.get('/food/food-5/'),'2026-11-12');
  assert.equal(dates.get('/food/food-1/'),'2026-11-06');
  assert.equal(dates.get('/editorial-standards/'),'2026-10-23');
});

test('generic, legal and dynamic routes do not invent changes',()=>{
  for(const route of ['/','/about/','/privacy-policy/','/today/','/finance/'])
    assert.equal(dates.has(route),false,route);
});

test('normalize all sitemap URLs without deleting records, idempotently',()=>{
  const {xml,summary}=updateSitemapDates(raw,dates);
  assert.equal(summary.total,routes.length);
  assert.equal(summary.dated,48+14+2+1);
  assert.equal(summary.undated,routes.length-summary.dated);
  assert.equal((xml.match(/<loc>/g)||[]).length,routes.length);
  assert.equal(updateSitemapDates(xml,dates).xml,xml);
  assert.match(xml,/<loc>https:\/\/pagero.kr\/life\/car\/<\/loc><lastmod>2026-10-03<\/lastmod>/);
  assert.match(xml,/<loc>https:\/\/pagero.kr\/life\/support\/<\/loc><lastmod>2026-11-16<\/lastmod>/);
  assert.match(xml,/<loc>https:\/\/pagero.kr\/life\/<\/loc><\/url>/);
  assert.doesNotMatch(xml,/<loc>https:\/\/pagero.kr\/life\/about\/<\/loc><lastmod>/);
});

test('invalid source dates, missing content and duplicate sitemap paths fail',()=>{
  const bad=posts.map(p=>({...p}));
  bad[0].updatedAt='2026-02-31';
  assert.throws(()=>dateMapForSitemap(bad,foodGuides,policy),/Invalid source date/);
  assert.throws(()=>dateMapForSitemap(posts,foodGuides,''),/visible review date/);
  const duplicate=raw.replace('</urlset>',
    '<url><loc>https://pagero.kr/life/</loc></url></urlset>');
  assert.throws(()=>updateSitemapDates(duplicate,dates),/Duplicate sitemap URL/);
});
