import { cached, text } from './_shared.js';

// Publisher-owned RSS only. Show headlines, source, time and direct links;
// article bodies, summaries and images are not copied.
const FEEDS = [
  {source:'연합뉴스',category:'전체',url:'https://www.yna.co.kr/rss/news.xml',hosts:['yna.co.kr']},
  {source:'연합뉴스',category:'경제',url:'https://www.yna.co.kr/rss/economy.xml',hosts:['yna.co.kr']},
  {source:'뉴시스',category:'전체',url:'https://newsis.com/RSS/sokbo.xml',hosts:['newsis.com']},
  {source:'매일경제',category:'경제',url:'https://www.mk.co.kr/rss/30000001/',hosts:['mk.co.kr']},
  {source:'한겨레',category:'전체',url:'https://www.hani.co.kr/rss/',hosts:['hani.co.kr']}
];
function decode(input) {
  return String(input||'')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>{
      const e=entity.toLowerCase();
      if(e.startsWith('#')){
        const n=e.startsWith('#x')?parseInt(e.slice(2),16):parseInt(e.slice(1),10);
        return Number.isFinite(n)&&n>31&&n<0x110000?String.fromCodePoint(n):'';
      }
      return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e]||'';
    })
    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function tag(src, name) {
  const safe=String(name).replace(/[^a-z:]/gi,'');
  const match=src.match(new RegExp('<'+safe+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+safe+'>','i'));
  return match?decode(match[1]):'';
}
function originalUrl(value,hosts) {
  try{
    const u=new URL(value);
    if(!['https:','http:'].includes(u.protocol) ||
      !hosts.some(host=>u.hostname===host||u.hostname.endsWith('.'+host)))return null;
    u.protocol='https:';
    u.hash='';
    return u.toString();
  }catch{return null;}
}
async function sourceFeed(feed) {
  const response=await fetch(feed.url,{
    headers:{Accept:'application/rss+xml, application/xml, text/xml, */*',
      'User-Agent':'Life-Pagero-HeadlineReader/1.0'},
    signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error('RSS_HTTP_'+response.status);
  const xml=(await response.text()).slice(0,1100000);
  if(!/<(?:rss|rdf:RDF|item|feed)\b/i.test(xml))throw Error('RSS_INVALID');
  const items=[];
  for(const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
    const part=match[1];
    const headline=text(tag(part,'title'),160);
    const url=originalUrl(tag(part,'link'),feed.hosts);
    const date=Date.parse(tag(part,'pubDate')||tag(part,'dc:date'));
    if(!headline||!url||!Number.isFinite(date))continue;
    if(date>Date.now()+3600000 || date<Date.now()-3*86400000)continue;
    if(/^(\[?(사설|칼럼|기고|만평|광고|기자수첩|오피니언)\]?)[\s:]/.test(headline))continue;
    items.push({title:headline,url,source:feed.source,category:feed.category,
      publishedAt:new Date(date).toISOString()});
    if(items.length>=30)break;
  }
  return items;
}
export async function onRequestGet(context) {
  return cached(context,'news-headlines',600,async () => {
    const results=await Promise.allSettled(FEEDS.map(sourceFeed));
    const all=[],sources=[];
    results.forEach((out,i)=>{
      const f=FEEDS[i];
      if(out.status==='fulfilled' && out.value.length){
        all.push(...out.value);
        sources.push({name:f.source,feed:f.category,status:'ok'});
      }else{
        sources.push({name:f.source,feed:f.category,status:'unavailable'});
      }
    });
    const seen=new Set();
    const items=all.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))
      .filter(item=>{
        const signature=item.title.replace(/[\s\p{P}]/gu,'').slice(0,48);
        if(seen.has(item.url)||seen.has(signature))return false;
        seen.add(item.url);seen.add(signature);return true;
      }).slice(0,30);
    if(items.length===0)throw Error('NEWS_NO_VERIFIED_ITEMS');
    return {
      source:'언론사 공식 RSS',mode:'원문 연결 헤드라인',
      note:'기사 제목·언론사·발행시각만 표시하며 본문은 원본 기사에서 확인합니다.',
      partial:sources.some(s=>s.status!=='ok'),sources,items
    };
  });
}
