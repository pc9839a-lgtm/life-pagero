import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {publishedGuideCount} from './published-guide-count.mjs';

// This is not an AdSense approval prediction: it enforces an actual
// content-first experience for users and ad-review crawlers.
const DIST=path.resolve('dist');
let articles=0;
let continuations=0;
const forbidden=/(?:ads-partners\.coupang\.com|PartnersCoupang\.G|life-coupang-placement|coupang-banner\.css|data-life-coupang-banner|AF2358798)/i;
for(const category of ['car','support']){
 const dir=path.join(DIST,category);
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const first=path.join(dir,entry.name,'index.html');
  if(!fs.existsSync(first))continue;
  for(const part of [1,2,3]){
   const file=part===1?first:path.join(dir,entry.name,String(part),'index.html');
   assert(fs.existsSync(file),'missing previously published guide section: '+file);
   const html=fs.readFileSync(file,'utf8');
   assert(!forbidden.test(html),'advertising vendor code or banner on information article: '+file);
   assert(html.includes('google-adsense-account'),'AdSense verification meta lost: '+file);
   assert(html.includes('class="article-content"'),'original article body missing: '+file);
   assert(html.includes('class="source-box"'),'official source references missing: '+file);
   assert((html.match(/<link rel="canonical"/g)||[]).length===1,'canonical changed: '+file);
   if(part===1){
    assert(!/content="noindex/i.test(html),'original first article wrongly noindexed: '+file);
    articles++;
   }else{
    assert(/content="noindex,follow/i.test(html),'continuation indexing changed: '+file);
    continuations++;
   }
  }
 }
}
assert.equal(articles,publishedGuideCount,'all published article bodies must be checked');
assert.equal(continuations,2*publishedGuideCount,'all continuation sections must be checked');
const home=fs.readFileSync(path.join(DIST,'index.html'),'utf8');
assert.equal((home.match(/data-life-coupang-banner="sitewide-v4"/g)||[]).length,1,
 'publisher homepage placement must remain available');
assert(home.includes('google-adsense-account'),'publisher verification on home must remain intact');
for(const name of ['food/index.html','deals/index.html']){
 assert(fs.existsSync(path.join(DIST,name)),'shopping destination lost: '+name);
}
console.log('[adsense-content-first] PASS '+articles+' canonical articles, '+continuations+
 ' noindex continuations: zero intrusive affiliate banners; homepage publisher verification, category navigation and shopping destinations preserved.');
