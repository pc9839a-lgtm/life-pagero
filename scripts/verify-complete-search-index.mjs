import fs from 'node:fs';
import path from 'node:path';
import {searchGuides,searchResultHref} from '../public/life-search-core.js';

const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const OMIT=new Set(['/','/about/','/privacy-policy/','/contact/']);
const read=file=>fs.readFileSync(path.join(DIST,file),'utf8');
const fail=s=>{throw Error('[search-qa] '+s)};
const sitemap=read('sitemap.xml');
const expected=[...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
  .map(m=>m[1]).filter(url=>url.startsWith(SITE+'/'))
  .map(url=>url.slice(SITE.length))
  .filter(route=>!OMIT.has(route));
const index=JSON.parse(read('search-index.json'));
const items=new Map(index.map(item=>[item.url,item]));
if(index.length<65||expected.length!==index.length)
  fail('Sitemap and local search mismatch: '+expected.length+'/'+index.length);
if(items.size!==index.length)fail('Duplicate search destinations');
for(const route of expected){
  const item=items.get(route);
  if(!item)fail('Index missing public destination '+route);
  const html=read(route.slice(1)+'index.html');
  if(/<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/i.test(html))
    fail('Search includes noindex page '+route);
  const actualTitle=(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'')
    .replace(/\s*\|\s*생활비서$/,'').trim();
  if(!actualTitle)fail('Missing real HTML title '+route);
  if(!item.title||!item.description||!Array.isArray(item.keywords))
    fail('Incomplete search metadata '+route);
  if(!item.url.startsWith('/'))fail('Offsite link in search index '+route);
}
const page=read('search/index.html');
if(!page.includes('id="page-search"')||!page.includes('id="search-results"'))
  fail('Search controls missing');
if(!page.includes('type="module" src="/life-search.js"'))
  fail('Safe search module not loaded');
if(!page.includes('name="robots" content="noindex'))
  fail('Search results page must remain noindex');
for(const asset of ['life-search.js','life-search-core.js'])
  if(!fs.existsSync(path.join(DIST,asset)))fail('Client script missing '+asset);
const assertions=[
  ['대출 이자 계산','/finance/loan-payment/'],
  ['자동차 검사기간','/car/car-inspection-period/'],
  ['주거 급여','/support/housing-benefit-2026/'],
  ['금리비교','/finance/savings/'],
];
for(const [query,url] of assertions){
  if(!items.has(url))fail('Important indexable destination absent '+url);
  if(!searchGuides(index,query,20).some(item=>item.url===url))
    fail('Task-based query does not find '+url+' for '+query);
}
// Search links are assembled in the client after the HTML proxy has already
// rewritten markup. They MUST carry /life/ themselves; the proxy cannot fix JS.
const browserSearchScript=read('life-search.js');
if(!browserSearchScript.includes('anchor.href = searchResultHref(item.url, import.meta.url);'))
  fail('Search result anchors bypass canonical module-base resolver');
const canonicalModule='https://pagero.kr/life/life-search.js';
for(const item of index){
  const actual=searchResultHref(item.url,canonicalModule);
  const expected='https://pagero.kr/life'+item.url;
  if(actual!==expected)
    fail('Clicked search result leaves the LIFE canonical prefix '+item.url+' -> '+actual);
}
console.log('[search-link-qa] '+index.length+
  ' clickable results resolve to canonical /life/ routes, not root-level Pagero URLs.');
console.log('[search-qa] '+index.length+' canonical searchable pages, '+assertions.length+
  ' essential journeys, page/module/noindex and sitemap coverage verified.');
