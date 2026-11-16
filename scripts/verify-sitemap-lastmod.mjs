import fs from 'node:fs';
import path from 'node:path';
import {dateMapForSitemap,updateSitemapDates} from './sitemap-lastmod-provenance.mjs';

const DIST=path.resolve('dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const filename=path.join(dir,entry.name);
  return entry.isDirectory()?walk(filename):[filename];
});
const posts=walk(path.resolve('content/posts')).filter(file=>file.endsWith('.json'))
  .map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
const food=JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
const standards=fs.readFileSync(path.join(DIST,'editorial-standards/index.html'),'utf8');
const dates=dateMapForSitemap(posts,food,standards);
const sitemap=fs.readFileSync(path.join(DIST,'sitemap.xml'),'utf8');
const {xml,summary}=updateSitemapDates(sitemap,dates);
if(sitemap!==xml)throw Error('[sitemap-qa] Final sitemap is not normalized or dates are inaccurate');
if(summary.total<75||summary.dated<60||summary.undated<8)
  throw Error('[sitemap-qa] Unexpected publishing/date coverage '+JSON.stringify(summary));
const blocks=[...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map(x=>x[0]);
for(const route of ['/','/about/','/privacy-policy/','/contact/','/today/']){
  const block=blocks.find(value=>value.includes('<loc>https://pagero.kr/life'+route+'</loc>'));
  if(!block)throw Error('[sitemap-qa] Missing static destination '+route);
  if(block.includes('<lastmod>'))throw Error('[sitemap-qa] Unverified lastmod exposed for '+route);
}
const sitemapIndex=fs.readFileSync(path.join(DIST,'sitemap-index.xml'),'utf8');
if(/<lastmod>/.test(sitemapIndex))
  throw Error('[sitemap-qa] Sitemap index has unverified XML file modification date');
console.log('[sitemap-qa] PASS '+summary.total+' URLs, '+summary.dated+
  ' source-backed lastmod values, '+summary.undated+' pages without fabricated dates.');
