import fs from 'node:fs';
import path from 'node:path';
import {extractInternalLinks,discoverGraph} from './life-internal-link-graph-core.mjs';

const DIST=path.resolve('dist');
const SITE='https://pagero.kr/life';
const OUT=path.resolve('artifacts/life-internal-link-graph.json');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const file=path.join(dir,e.name);
  return e.isDirectory()?walk(file):[file];
});
const pages=new Map();
const duplicates=[];
for(const file of walk(DIST).filter(x=>path.basename(x)==='index.html')){
  const relative=path.relative(DIST,file).replaceAll(path.sep,'/');
  const route='/'+relative.slice(0,-'index.html'.length);
  if(pages.has(route))duplicates.push(route);
  pages.set(route,fs.readFileSync(file,'utf8'));
}
const xml=fs.readFileSync(path.join(DIST,'sitemap.xml'),'utf8');
const sitemap=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)]
  .map(m=>m[1].trim().replaceAll('&amp;','&'));
const urls=sitemap.map(url=>{
  if(!url.startsWith(SITE+'/'))throw Error('[link-graph] External sitemap URL '+url);
  return url.slice(SITE.length);
});
if(new Set(urls).size!==urls.length)throw Error('[link-graph] Duplicated sitemap URLs');
const graph=new Map();
const inbound=new Map();
for(const [route,html] of pages){
  const destinations=extractInternalLinks(html,route).filter(link=>pages.has(link));
  graph.set(route,destinations);
  for(const target of destinations){
    if(!inbound.has(target))inbound.set(target,new Set());
    inbound.get(target).add(route);
  }
}
const paths=discoverGraph(graph);
const orphan=urls.filter(route=>!paths.has(route)||!pages.has(route));
const deep=urls.filter(route=>(paths.get(route)?.length??99)-1>5);
const zeroInbound=urls.filter(route=>route!=='/'&&(inbound.get(route)?.size??0)===0);
const report={
  canonicalSite:SITE,
  homepage:'/',
  htmlPages:pages.size,
  canonicalUrls:urls.length,
  reachable:urls.length-orphan.length,
  maxClicks:Math.max(0,...urls.map(route=>(paths.get(route)?.length??1)-1)),
  orphans:orphan,
  depthOverFive:deep.map(route=>({route,path:paths.get(route)||null})),
  zeroInbound,
  routes:urls.map(route=>({
    route,
    clicks:paths.has(route)?paths.get(route).length-1:null,
    samplePath:paths.get(route)||null,
    distinctInboundPages:inbound.get(route)?.size??0
  }))
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
if(!pages.has('/')||pages.size<80)throw Error('[link-graph] Too few emitted HTML routes '+pages.size);
if(duplicates.length||orphan.length||deep.length||zeroInbound.length) {
  console.error('[link-graph] Orphans: '+JSON.stringify(orphan));
  console.error('[link-graph] Too deep: '+JSON.stringify(deep));
  console.error('[link-graph] No HTML inbound: '+JSON.stringify(zeroInbound));
  throw Error('[link-graph] Fix static discoverability before merge: '+JSON.stringify({
    duplicates,orphan,deep,zeroInbound
  }));
}
console.log('[link-graph] PASS '+urls.length+' canonical URLs reachable from homepage; '+
  'maxClicks='+report.maxClicks+', zeroOrphans=0, zeroUnlinked=0, htmlPages='+pages.size);
