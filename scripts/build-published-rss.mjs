import fs from 'node:fs';
import path from 'node:path';
import {SITE,FEED_URL,collectPublishedFeedItems,renderRss} from './published-rss-core.mjs';

// Final publisher: articles, food posts, sitemap and SEO dates now all exist.
const DIST=path.resolve('dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(dir,entry.name);
  return entry.isDirectory()?walk(file):[file];
});
const posts=walk(path.resolve('content/posts'))
  .filter(file=>file.endsWith('.json'))
  .map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
const food=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const items=collectPublishedFeedItems(posts,food);
const sitemap=fs.readFileSync(path.join(DIST,'sitemap.xml'),'utf8');
const canonicalUrls=new Set([...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
  .map(match=>match[1].replaceAll('&amp;','&')));
const canonicalPaths=[...canonicalUrls].map(url=>{
  if(!url.startsWith(SITE+'/'))throw Error('[rss-build] Sitemap contains a foreign origin '+url);
  return url.slice(SITE.length);
});
if(items.length<60 || items.length>500)
  throw Error('[rss-build] Unexpected RSS article count '+items.length);
for(const item of items){
  if(!canonicalUrls.has(item.url))
    throw Error('[rss-build] RSS article missing from sitemap '+item.url);
  const pagePath=path.join(DIST,item.path.slice(1),'index.html');
  if(!fs.existsSync(pagePath))throw Error('[rss-build] Missing published article '+item.url);
  const html=fs.readFileSync(pagePath,'utf8');
  if(!html.includes('<link rel="canonical" href="'+item.url+'">'))
    throw Error('[rss-build] Article canonical mismatch '+item.url);
  if(!/<meta\s+name="robots"\s+content="index,follow/i.test(html))
    throw Error('[rss-build] RSS item not indexable '+item.url);
}
fs.writeFileSync(path.join(DIST,'rss.xml'),renderRss(items),'utf8');

// Expose RSS autodiscovery without adding intrusive visible UI. Covers all
// final canonical pages, including finance/food pages added after build.mjs.
const discovery='<link rel="alternate" type="application/rss+xml" title="생활비서 RSS" href="'+FEED_URL+'">';
let discovered=0;
for(const pathname of canonicalPaths){
  const file=path.join(DIST,pathname==='/'?'index.html':pathname.slice(1)+'index.html');
  if(!fs.existsSync(file))throw Error('[rss-build] Sitemap HTML is missing: '+pathname);
  let html=fs.readFileSync(file,'utf8');
  if(!html.includes('<head>')||!html.includes('</head>'))
    throw Error('[rss-build] Document HEAD missing '+pathname);
  if(html.includes('type="application/rss+xml"'))
    throw Error('[rss-build] RSS discovery already added '+pathname);
  html=html.replace('</head>',discovery+'</head>');
  fs.writeFileSync(file,html,'utf8');
  discovered++;
}
console.log('[rss-build] '+items.length+' published articles ('+
  items.filter(x=>x.category==='먹거리').length+' food) in RSS, '+
  discovered+' indexable pages with feed autodiscovery; no new sitemap URLs.');
