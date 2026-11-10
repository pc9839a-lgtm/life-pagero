import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const base=path.resolve('dist');
const read=file=>fs.readFileSync(path.join(base,file),'utf8');
const root=read('events/index.html');
const data=JSON.parse(read('events-data.json'));
const home=read('index.html');
const browserScript=read('events-ui.js');
const headers=read('_headers');
assert.ok(browserScript.includes("location.pathname.startsWith('/life/')"),
  'event browser must recognize canonical /life/ path');
assert.ok(browserScript.includes("fetch(prefix+'events-data.json')"),
  'event JSON must use /life/ prefix and browser-cacheable fetch');
assert.ok(browserScript.includes("a.href=prefix+'events/'"),
  'filtered event links must stay in canonical /life/events/ space');
assert.ok(browserScript.includes("new URL(prefix+'events/'"),
  'shared event links must stay in canonical /life/events/ space');
assert.ok(!browserScript.includes("cache:'no-cache'") &&
  !browserScript.includes("fetch('/events-data.json'"),
  'event snapshot must not revalidate unnecessarily or fetch from wrong root');
assert.match(headers,/\/events-data\.json\s+Cache-Control: public, max-age=300, s-maxage=900/,
  'static event JSON must have a short browser+edge TTL');

assert.match(root,/<h1>이번 주 축제·행사<\/h1>/);
assert.match(root,/<link rel="canonical" href="https:\/\/pagero\.kr\/life\/events\/">/);
assert.match(root,/data-region/);
assert.match(root,/data-category/);
assert.match(root,/data-fee/);
assert.match(root,/data-share-list/);
assert.match(root,/href="\/events\/" aria-current="page"/);
for(const p of ['today','tomorrow','weekend','this-week','next-week','custom'])
  assert.ok(root.includes('data-period="'+p+'"'),'missing date filter '+p);
for(const p of ['events-ui.css','events-ui.js','events-data.json'])
  assert.ok(fs.existsSync(path.join(base,p)),'missing asset '+p);
assert.match(home,/href="\/events\/"/);
for(const p of ['car/index.html','support/index.html','today/index.html','finance/index.html'])
  assert.ok(fs.existsSync(path.join(base,p)),'existing page missing '+p);
const sitemap=read('sitemap.xml');
const rows=data.events||[];
if(rows.length===0){
  assert.match(root,/content="noindex,follow"/);
  assert.doesNotMatch(sitemap,/\/life\/events\//);
  assert.doesNotMatch(root,/가짜 인기|예시 행사 1위/);
}else{
  assert.ok(sitemap.includes('/life/events/'),'sitemap listing absent');
  for(const e of rows) {
    assert.ok(e.id && e.slug && e.startDate && e.endDate);
    const detail=read('events/'+e.slug+'/index.html');
    assert.match(detail,/<h1>/);
    assert.ok(detail.includes('data-copy-event'),'detail share action missing');
    assert.ok(detail.includes('href="/events/"'),'back link missing');
    assert.ok(sitemap.includes('/life/events/'+e.slug+'/'));
  }
}
console.log('[events-qa] listing, filters, source snapshot, detail sharing, SEO and legacy routes verified ('+rows.length+' source records).');
