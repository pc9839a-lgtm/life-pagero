import fs from 'node:fs';
import path from 'node:path';

// Rebuild the local search catalog from FINAL public sitemap pages.
// Finance tools and other late-built indexable destinations were previously
// absent because search-index.json was initially generated from articles only.
const DIST=path.resolve('dist');
const BASE='https://pagero.kr/life';
const SKIP=new Set(['/','/about/','/privacy-policy/','/contact/']);
const ALIASES={
  '/finance/loan-payment/':['대출 이자 계산','대출 계산기','대출 상환액','원리금 계산'],
  '/finance/savings/':['예금 금리 비교','적금 금리 비교','금리비교'],
  '/finance/savings-calculator/':['예금 이자 계산','적금 이자 계산','저축 계산기'],
  '/finance/mortgage-calculator/':['주택담보대출 계산기','주담대 계산','담보대출 이자'],
  '/finance/markets/':['주식 시세','코인 시세','증권','시장 정보'],
  '/tools/car-cost/':['자동차 유지비 계산','차량 연료비 계산'],
  '/today/':['오늘 날씨','환율','날씨','주식','코인'],
};
const read=file=>fs.readFileSync(path.join(DIST,file),'utf8');
const fail=message=>{throw Error('[search-index] '+message)};
const decode=value=>String(value).replace(/&(?:amp|quot|lt|gt|#39|apos);/g,t=>({
  '&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&#39;':"'",'&apos;':"'"
})[t]);
const oldIndex=JSON.parse(read('search-index.json'));
if(!Array.isArray(oldIndex))fail('Previous catalog not an array');
const oldByUrl=new Map(oldIndex.map(record=>[record.url,record]));
const sitemap=read('sitemap.xml');
const locs=[...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
  .map(match=>decode(match[1].trim()));
const seen=new Set(),results=[];
for(const address of locs){
  if(!address.startsWith(BASE+'/'))fail('Unexpected sitemap origin '+address);
  const route=address.slice(BASE.length);
  if(!/^\/(?:[a-z0-9-]+\/)*$/.test(route))fail('Unexpected sitemap path '+route);
  if(seen.has(route))fail('Duplicate sitemap path '+route);
  seen.add(route);
  const file=route==='/'?'index.html':route.slice(1)+'index.html';
  if(!fs.existsSync(path.join(DIST,file)))fail('Published sitemap destination missing '+route);
  const html=read(file);
  const robots=html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1]||'';
  if(!robots||/\bnoindex\b/i.test(robots))fail('Sitemap includes unindexable page '+route);
  const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if(canonical!==address)fail('Canonical mismatch '+route);
  const title=decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'')
    .replace(/\s*\|\s*생활비서$/,'').trim();
  const description=decode(html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]||'').trim();
  if(!title||!description)fail('Search result is missing actual page title/description '+route);
  if(SKIP.has(route))continue;
  const existing=oldByUrl.get(route);
  const keywords=[...(Array.isArray(existing?.keywords)?existing.keywords:[]),...(ALIASES[route]||[])];
  results.push({url:route,title,description,keywords:[...new Set(keywords.map(String))]});
}
if(results.length<65)fail('Unexpectedly few public pages: '+results.length);
for(const [route,keywords] of Object.entries(ALIASES)){
  if(!seen.has(route))console.log('[search-index] Not-yet-indexed utility excluded: '+route+' ('+keywords.length+' aliases)');
}
fs.writeFileSync(path.join(DIST,'search-index.json'),JSON.stringify(results)+'\n','utf8');
console.log('[search-index] '+results.length+' indexable destinations in local search from '+locs.length+
  ' sitemap URLs; '+SKIP.size+' navigational/legal pages omitted.');
