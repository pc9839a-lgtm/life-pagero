// Cloudflare Pages: render verified FX and already-cached Today datasets in
// the initial HTML. Cold weather/news/crypto feeds remain client-loaded so
// the page never waits for multiple external providers on a cold PoP.
import { onRequestGet as readFx } from './api/fx.js';
import { peekCached } from './api/_shared.js';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const won=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
const exactWon=new Intl.NumberFormat('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});
const clock=value=>{
  const d=new Date(value);
  return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('ko-KR',{
    timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'
  }).format(d):'';
};
const CURRENCIES=[
  {code:'USD',name:'미국 달러',unit:1},
  {code:'JPY',name:'일본 엔',unit:100},
  {code:'EUR',name:'유로',unit:1},
  {code:'CNY',name:'중국 위안',unit:1}
];
const verifiedTimestamp=data=>typeof data?.retrievedAt==='string'&&!!clock(data.retrievedAt);
function withStatus(html,key,message){
  const pattern=new RegExp('(<section\\b[^>]*\\bdata-today-'+key+
    '\\b[\\s\\S]*?<p class="today-widget-meta" data-today-status role="status">)'+
    '[\\s\\S]*?(<\\/p>)');
  return html.replace(pattern,(_full,before,after)=>before+escapeHtml(message)+after);
}
function withItems(html,attribute,kind,body,payload){
  const opening='<div '+attribute+'>';
  const pattern=new RegExp('<div '+attribute+'>[\\s\\S]*?<\\/div>');
  if(!pattern.test(html))return html;
  const script=payload?
    '<script type="application/json" data-today-'+kind+'-seed>'+
      JSON.stringify(payload).replace(/</g,'\\u003c')+'</script>':'';
  return html.replace(pattern,()=>'<div '+attribute+' data-'+kind+
    '-preloaded="true">'+body+'</div>'+script);
}
function renderVerifiedFx(html,data){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data?.sourceDate||'')
    ||!Array.isArray(data?.items)||data.items.length!==4)return html;
  const byCode=new Map(data.items.map(item=>[item.code,item]));
  const rows=[];
  for(const currency of CURRENCIES){
    const item=byCode.get(currency.code);
    if(!item||item.unit!==currency.unit||!Number.isFinite(item.krw)||item.krw<=0)
      return html;
    rows.push('<div class="today-fx"><span class="today-fx-name">'
      +escapeHtml(currency.name)+'<small>'+currency.unit+' '+currency.code+'</small></span>'
      +'<strong class="today-fx-value">'+exactWon.format(item.krw)+'원</strong></div>');
  }
  const out=withItems(html,'data-fx-items','fx',
    '<div class="today-fx-list">'+rows.join('')+'</div>');
  return withStatus(out,'fx','ECB 참고환율 · '+data.sourceDate+' 기준 · 은행 거래환율 아님');
}
function renderCachedWeather(html,data){
  if(!verifiedTimestamp(data)||data?.city!=='seoul'
    ||!Number.isFinite(data.temperatureC))return html;
  const humidity=Number.isFinite(data.humidityPercent)?won.format(data.humidityPercent)+'%':'—';
  const rain=Number.isFinite(data.precipitationMm)?won.format(data.precipitationMm)+'mm':'—';
  const body='<strong class="today-weather-temp">'+won.format(data.temperatureC)+'°</strong>'
    +'<span class="today-weather-condition">'+escapeHtml(data.condition||'실황 관측')+'</span>'
    +'<p class="today-weather-details">습도 '+humidity+' · 1시간 강수 '+rain+'</p>';
  const out=withItems(html,'data-weather-items','weather',body);
  return withStatus(out,'weather','기상청 · 관측 '
    +String(data.observationDate||'')+' '+String(data.observationTime||'')
    +' · 조회 '+clock(data.retrievedAt));
}
const HEADLINE_HOSTS=['yna.co.kr','newsis.com','mk.co.kr','hani.co.kr'];
const verifiedHeadline=row=>{
  try{
    const u=new URL(row.url);
    return u.protocol==='https:'&&HEADLINE_HOSTS.some(host=>
      u.hostname===host||u.hostname.endsWith('.'+host))&&
      typeof row.title==='string'&&row.title.length>0&&row.title.length<=170&&
      typeof row.source==='string'&&Number.isFinite(Date.parse(row.publishedAt));
  }catch{return false;}
};
function renderCachedNews(html,data){
  if(!verifiedTimestamp(data)||!Array.isArray(data.items))return html;
  const items=data.items.filter(row=>row&&verifiedHeadline(row)).slice(0,30);
  if(!items.length)return html;
  const lines=items.slice(0,4).map(row=>
    '<li><a class="today-news-title" href="'+escapeHtml(row.url)+
    '" target="_blank" rel="noopener noreferrer">'+escapeHtml(row.title)+
    '</a><span class="today-news-meta">'+escapeHtml(row.source)+' · '+
    escapeHtml(clock(row.publishedAt))+'</span></li>').join('');
  const out=withItems(html,'data-news-items','news',
    '<ul class="today-news-list">'+lines+'</ul>',
    {items,retrievedAt:data.retrievedAt});
  return withStatus(out,'news','언론사 · '+clock(data.retrievedAt));
}
function verifiedCoin(row){
  return row&&typeof row.market==='string'&&/^KRW-[A-Z0-9]+$/.test(row.market)
    &&Number.isFinite(row.price)&&row.price>0&&
    (row.changeRate==null||Number.isFinite(row.changeRate))&&
    typeof row.name==='string'&&typeof row.code==='string';
}
function renderCachedCrypto(html,data){
  if(!verifiedTimestamp(data)||!Array.isArray(data.items))return html;
  const items=data.items.filter(verifiedCoin).slice(0,12);
  if(items.length<3)return html;
  const lines=items.slice(0,6).map(row=>{
    const change=row.changeRate==null?'—':
      (row.changeRate>=0?'+':'')+(row.changeRate*100).toFixed(2)+'%';
    const cls=row.changeRate>0?'positive':row.changeRate<0?'negative':'neutral';
    return '<a class="today-coin" href="https://upbit.com/exchange?code=CRIX.UPBIT.'
      +escapeHtml(row.market)+'" target="_blank" rel="noopener noreferrer">'
      +'<span class="today-coin-name">'+escapeHtml(row.name)+'<small>'+escapeHtml(row.code)+'</small></span>'
      +'<strong class="today-coin-price">'+won.format(row.price)+'원</strong>'
      +'<span class="today-coin-change '+cls+'">'+escapeHtml(change)+'</span></a>';
  }).join('');
  const out=withItems(html,'data-coin-items','crypto',
    '<div class="today-coin-list">'+lines+'</div>',
    {items,retrievedAt:data.retrievedAt});
  return withStatus(out,'crypto','업비트 KRW · 조회 '
    +clock(data.retrievedAt)+' · 전일 종가 대비');
}
export async function onRequestGet(context){
  const url=new URL(context.request.url);
  const pathname=url.pathname.replace(/\/+$/,'')||'/';
  if(pathname!=='/today'&&pathname!=='/life/today')return context.next();
  // Snapshot reads are Cache API hits only; they never fetch remote sources.
  const [page,fxResponse,weather,news,crypto]=await Promise.all([
    context.next(),
    readFx({...context,request:new Request(new URL('/today/api/fx',url.origin))}),
    peekCached('weather-seoul'),
    peekCached('news-headlines'),
    peekCached('crypto-top-krw')
  ]);
  if(!page.ok||!page.headers.get('content-type')?.includes('text/html'))return page;
  try{
    const original=await page.text();
    let html=original;
    if(fxResponse.ok){
      const data=await fxResponse.json();
      if(data.status==='ok')html=renderVerifiedFx(html,data);
    }
    html=renderCachedWeather(html,weather);
    html=renderCachedNews(html,news);
    html=renderCachedCrypto(html,crypto);
    if(html===original)return new Response(original,page);
    const headers=new Headers(page.headers);
    headers.delete('content-length');
    headers.set('cache-control','public, max-age=60, s-maxage=300');
    if(html.includes('data-fx-preloaded="true"'))
      headers.set('x-life-today-initial-fx','verified');
    if(['weather','news','crypto'].some(k=>html.includes('data-'+k+'-preloaded="true"')))
      headers.set('x-life-today-warm-snapshots','verified');
    return new Response(html,{status:page.status,headers});
  }catch(error){
    console.warn('Today initial HTML cache preload unavailable',String(error?.message||error));
    return page;
  }
}
