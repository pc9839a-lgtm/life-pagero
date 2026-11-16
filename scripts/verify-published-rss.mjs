import fs from 'node:fs';
import path from 'node:path';
import {SITE,FEED_URL,collectPublishedFeedItems,renderRss} from './published-rss-core.mjs';

const DIST=path.resolve('dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name);
  return entry.isDirectory()?walk(file):[file];
});
const posts=walk(path.resolve('content/posts')).filter(file=>file.endsWith('.json'))
  .map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
const food=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const expected=collectPublishedFeedItems(posts,food);
const rendered=renderRss(expected);
const rss=fs.readFileSync(path.join(DIST,'rss.xml'),'utf8');
if(rss!==rendered) throw Error('[rss-qa] Generated RSS differs from article sources');
if(!rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')
  || !rss.includes('<rss version="2.0"') || !rss.endsWith('</rss>\n'))
  throw Error('[rss-qa] Invalid feed envelope');
const entries=[...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match=>match[1]);
if(entries.length!==expected.length || expected.length<60)
  throw Error('[rss-qa] Incorrect RSS item count '+entries.length+'/'+expected.length);
const sitemap=fs.readFileSync(path.join(DIST,'sitemap.xml'),'utf8');
const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(!locs.length) throw Error('[rss-qa] Sitemap empty');
const feedUrls=new Set();
for(let i=0;i<expected.length;i++){
  const entry=entries[i],item=expected[i];
  for(const value of [
    '<link>'+item.url+'</link>',
    '<guid isPermaLink="true">'+item.url+'</guid>',
    '<dcterms:issued>'+item.publishedAt+'</dcterms:issued>',
    '<dcterms:modified>'+item.updatedAt+'</dcterms:modified>',
  ])if(!entry.includes(value))throw Error('[rss-qa] Missing feed field '+item.url+' '+value);
  if(!/<pubDate>[A-Z][a-z]{2}, [0-9]{2} [A-Z][a-z]{2} [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT<\/pubDate>/.test(entry))
    throw Error('[rss-qa] Invalid RFC 822 date for '+item.url);
  if(feedUrls.has(item.url))throw Error('[rss-qa] Duplicate item '+item.url);
  feedUrls.add(item.url);
  if(!locs.includes(item.url))throw Error('[rss-qa] URL not present in sitemap '+item.url);
}
if(expected.filter(x=>x.category==='먹거리').length!==food.guides.filter(x=>!x.noindex).length)
  throw Error('[rss-qa] Food publisher article missing from feed');
if(feedUrls.size!==posts.filter(x=>!x.noindex).length+food.guides.filter(x=>!x.noindex).length)
  throw Error('[rss-qa] RSS dropped a published article');

const discovery='<link rel="alternate" type="application/rss+xml" title="생활비서 RSS" href="'+FEED_URL+'">';
for(const loc of locs){
  if(!loc.startsWith(SITE+'/'))throw Error('[rss-qa] External sitemap URL '+loc);
  const url=loc.slice(SITE.length);
  const file=path.join(DIST,url==='/'?'index.html':url.slice(1)+'index.html');
  const html=fs.readFileSync(file,'utf8');
  if(html.split(discovery).length!==2)
    throw Error('[rss-qa] Missing or duplicate RSS link '+url);
  if(html.indexOf(discovery)>html.indexOf('</head>'))
    throw Error('[rss-qa] RSS discovery must be in HEAD '+url);
}
if(!fs.readFileSync(path.join(DIST,'_headers'),'utf8')
    .includes('Content-Type: application/rss+xml; charset=utf-8'))
  throw Error('[rss-qa] Cloudflare RSS MIME type missing');
console.log('[rss-qa] '+entries.length+' valid source-backed feed items; '+
  food.guides.length+' food articles, '+locs.length+
  ' canonical HTML feed links, unique safe URLs and original/updated dates.');
