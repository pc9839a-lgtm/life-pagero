import {cached} from '../../today/api/_shared.js';

// Official source headlines only. This is not an exchange price feed and does
// not claim real-time, exhaustive news coverage or editorially verified summaries.
const FEEDS = [
  {name:'한국은행',type:'경제·금리',url:'https://www.bok.or.kr/portal/bbs/B0000552/news.rss?menuNo=200690',hosts:['www.bok.or.kr','bok.or.kr']},
  {name:'한국은행',type:'금융시장',url:'https://www.bok.or.kr/portal/bbs/P0002017/news.rss?menuNo=200365',hosts:['www.bok.or.kr','bok.or.kr']},
  {name:'금융위원회',type:'정책',url:'https://www.fsc.go.kr/about/fsc_bbs_rss/?fid=0111',hosts:['www.fsc.go.kr','fsc.go.kr']},
  {name:'DART 전자공시',type:'주식 공시',url:'https://dart.fss.or.kr/api/todayRSS.xml',hosts:['dart.fss.or.kr']}
];
const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
function clean(value) {
  return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,key)=>{
      const k=key.toLowerCase();
      if(k.startsWith('#')){const n=k[1]==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return n>=32&&n<=0x10ffff?String.fromCodePoint(n):'';}
      return entities[k]||'';
    }).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
function field(xml,name){
  const match=xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
  return match?clean(match[1]):'';
}
function safeLink(value,hosts){
  try{
    const u=new URL(value);
    if(!['https:','http:'].includes(u.protocol) || !hosts.includes(u.hostname))return null;
    u.protocol='https:';
    return u.href;
  }catch{return null;}
}
const highImpact=/(실적|영업이익|매출액|증자|감자|배당|자기주식|자사주|합병|분할|영업정지|관리종목|상장폐지|공개매수|기업설명|주식소각|대규모|수주계약|공급계약|파산|회생)/;
async function load(feed){
  const response=await fetch(feed.url,{signal:AbortSignal.timeout(7500),headers:{
    Accept:'application/rss+xml, application/xml, text/xml, */*',
    'User-Agent':'LifePageroFinanceFeed/1.0'
  }});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const xml=(await response.text()).slice(0,1200000);
  if(!/<(?:rss|rdf:RDF|item|feed)\b/i.test(xml)) throw new Error('NOT_RSS');
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,70)
    .flatMap(([,part])=>{
      const title=field(part,'title').slice(0,170);
      const address=safeLink(field(part,'link')||field(part,'guid'),feed.hosts);
      const rawDate=field(part,'pubDate')||field(part,'updated')||field(part,'dc:date');
      const parsed=Date.parse(rawDate);
      const iso=Number.isFinite(parsed)?new Date(parsed).toISOString():null;
      if(!title||!address||!iso)return [];
      if(feed.name==='DART 전자공시'&&!highImpact.test(title))return [];
      if(parsed>Date.now()+3600000 || parsed<Date.now()-30*86400000)return [];
      return [{title,url:address,publishedAt:iso,source:feed.name,type:feed.type}];
    });
}
export async function onRequestGet(context) {
  // Official headlines are public and request-invariant. One shared cached
  // response replaces four RSS requests per visitor/edge cache miss.
  return cached(context,'finance-official-issues',1800,async()=>{
    const loaded=await Promise.allSettled(FEEDS.map(load));
  const items=[],sources=[];
  loaded.forEach((res,index)=>{
    const feed=FEEDS[index];
    if(res.status==='fulfilled'){items.push(...res.value);sources.push({name:feed.name,type:feed.type,status:'ok'});}
    else{sources.push({name:feed.name,type:feed.type,status:'error'});}
  });
  const seen=new Set();
  const unique=items.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))
    .filter(item=>{if(seen.has(item.url))return false;seen.add(item.url);return true;}).slice(0,36);
    if(!unique.length)throw Error('FINANCE_NEWS_NO_VERIFIED_ITEMS');
    return {sourceType:'공식 발표·공시 RSS',
      partial:sources.some(x=>x.status!=='ok'),sources,items:unique};
  },{staleSeconds:21600,retrySeconds:600});
}
