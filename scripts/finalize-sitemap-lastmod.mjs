import fs from 'node:fs';
import path from 'node:path';
import {dateMapForSitemap,updateSitemapDates} from './sitemap-lastmod-provenance.mjs';

const dist=path.resolve('dist');
const content=path.resolve('content/posts');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const filename=path.join(dir,entry.name);
  return entry.isDirectory()?walk(filename):[filename];
});
const posts=walk(content).filter(filename=>filename.endsWith('.json'))
  .map(filename=>JSON.parse(fs.readFileSync(filename,'utf8')));
const food=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const standards=fs.readFileSync(path.join(dist,'editorial-standards/index.html'),'utf8');
const dates=dateMapForSitemap(posts,food,standards);
const file=path.join(dist,'sitemap.xml');
const original=fs.readFileSync(file,'utf8');
const {xml,summary}=updateSitemapDates(original,dates);
fs.writeFileSync(file,xml,'utf8');

const sitemapIndexFile=path.join(dist,'sitemap-index.xml');
const index=fs.readFileSync(sitemapIndexFile,'utf8');
if(!index.includes('<loc>https://pagero.kr/life/sitemap.xml</loc>'))
  throw Error('[sitemap-lastmod] Sitemap index missing canonical sitemap');
const updatedIndex=index.replace(/<lastmod>[\s\S]*?<\/lastmod>/g,'');
fs.writeFileSync(sitemapIndexFile,updatedIndex,'utf8');
console.log('[sitemap-lastmod] '+JSON.stringify(summary)+
  '; removed unsupported sitemap-index lastmod; retained exact published URL inventory.');
