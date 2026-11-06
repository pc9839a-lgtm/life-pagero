// Cloudflare Pages: render verified FX values directly in the first /today/ HTML.
// Reuse the existing cached FX endpoint and do not invent or store a rate.
import { onRequestGet as readFx } from './api/fx.js';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const formatWon=value=>new Intl.NumberFormat('ko-KR',{
  minimumFractionDigits:2,maximumFractionDigits:2
}).format(value)+'원';
const CURRENCIES=[
  {code:'USD',name:'미국 달러',unit:1},
  {code:'JPY',name:'일본 엔',unit:100},
  {code:'EUR',name:'유로',unit:1},
  {code:'CNY',name:'중국 위안',unit:1}
];
function renderVerifiedFx(html,data){
  const pattern=/<div data-fx-items>[\s\S]*?<\/div>/;
  if(!pattern.test(html)||!/^\d{4}-\d{2}-\d{2}$/.test(data?.sourceDate||'')
    ||!Array.isArray(data?.items)||data.items.length!==4)return null;
  const byCode=new Map(data.items.map(item=>[item.code,item]));
  const rows=[];
  for(const currency of CURRENCIES){
    const item=byCode.get(currency.code);
    if(!item||item.unit!==currency.unit||!Number.isFinite(item.krw)||item.krw<=0)
      return null;
    rows.push('<div class="today-fx"><span class="today-fx-name">'
      +escapeHtml(currency.name)+'<small>'+currency.unit+' '+currency.code+'</small></span>'
      +'<strong class="today-fx-value">'+formatWon(item.krw)+'</strong></div>');
  }
  const output=html.replace(pattern,
    '<div data-fx-items data-fx-preloaded="true"><div class="today-fx-list">'
    +rows.join('')+'</div></div>');
  return output.replace(
    /(<section\b[^>]*\bdata-today-fx\b[\s\S]*?<p class="today-widget-meta" data-today-status role="status">)[\s\S]*?(<\/p>)/,
    '$1ECB 참고환율 · '+escapeHtml(data.sourceDate)+' 기준 · 은행 거래환율 아님$2'
  );
}
export async function onRequestGet(context){
  const requestUrl=new URL(context.request.url);
  const pathname=requestUrl.pathname.replace(/\/+$/,'')||'/';
  if(pathname!=='/today'&&pathname!=='/life/today')return context.next();
  const [page,fxResponse]=await Promise.all([
    context.next(),
    readFx({...context,request:new Request(
      new URL('/today/api/fx',requestUrl.origin),{method:'GET'}
    )})
  ]);
  if(!page.ok||!page.headers.get('content-type')?.includes('text/html')
    ||!fxResponse.ok)return page;
  try{
    const data=await fxResponse.json();
    if(data.status!=='ok')return page;
    const original=await page.text();
    const html=renderVerifiedFx(original,data);
    if(!html)return new Response(original,page);
    const headers=new Headers(page.headers);
    headers.delete('content-length');
    headers.set('cache-control','public, max-age=60, s-maxage=300');
    headers.set('x-life-today-initial-fx','verified');
    return new Response(html,{status:page.status,headers});
  }catch(error){
    console.warn('today initial FX render unavailable',String(error?.message||error));
    return page;
  }
}
