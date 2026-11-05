// Cloudflare Pages: render verified FSS interest rates in the INITIAL HTML.
// No client-side JS or second API round-trip is required to see bank rates.
// Missing/invalid feeds leave the original official-link fallback untouched.
import { onRequestGet as fetchVerifiedProducts } from './api/products.js';

const htmlEscape=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
const formatRate=value=>Number.isFinite(value)?value.toFixed(2)+'%':'—';
const rankProducts=products=>{
  const valid=products.filter(p=>p&&typeof p.bank==='string'&&typeof p.product==='string'
    &&Number.isInteger(p.term)&&Number.isFinite(p.baseRate));
  const twelve=valid.filter(p=>p.term===12);
  return (twelve.length?twelve:valid).sort((a,b)=>(b.baseRate??-1)-(a.baseRate??-1)
    || (b.maxRate??-1)-(a.maxRate??-1) || a.bank.localeCompare(b.bank,'ko'));
};
const officialSourceDate=retrievedAt=>{
  const date=new Date(retrievedAt);
  if(!Number.isFinite(date.getTime()))return '금융감독원 공시';
  return '금융감독원 · '+new Intl.DateTimeFormat('ko-KR',{
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'
  }).format(date)+' KST';
};
const tableRows=products=>products.slice(0,80).map(item=>
  '<tr><td><strong>'+htmlEscape(item.bank)+'</strong><span class="finance-product-sub">'
  +htmlEscape(item.joinWay)+'</span></td>'
  +'<td><strong>'+htmlEscape(item.product)+'</strong><details class="finance-condition">'
  +'<summary>우대조건</summary><p>'+htmlEscape(item.preferential||'금융회사 상품설명서 참고')
  +'</p></details></td>'
  +'<td>'+item.term+'개월</td><td class="finance-rate">'+formatRate(item.baseRate)
  +'</td><td class="finance-rate finance-best">'+formatRate(item.maxRate)+'</td></tr>'
).join('');
const renderTable=products=>
  '<div class="finance-table-scroll"><table class="finance-rate-table">'
  +'<thead><tr><th scope="col">금융회사</th><th scope="col">상품명·우대조건</th>'
  +'<th scope="col">기간</th><th scope="col">기본금리</th>'
  +'<th scope="col">최고금리</th></tr></thead>'
  +'<tbody>'+tableRows(products)+'</tbody></table></div>';
const renderPreview=(products,prefix)=>'<div class="finance-preview-grid">'
  +products.slice(0,3).map(p=>'<a class="finance-preview-card" href="'+prefix+'finance/savings/">'
    +'<span class="finance-preview-bank">'+htmlEscape(p.bank)+'</span>'
    +'<strong class="finance-preview-rate">'+formatRate(p.baseRate)+'</strong>'
    +'<span class="finance-preview-product">'+htmlEscape(p.product)+'</span>'
    +'<span class="finance-preview-term">'+p.term+'개월 · 기본금리</span></a>').join('')
  +'</div><a class="finance-preview-more" href="'+prefix
  +'finance/savings/">은행별 예금·적금 전체 비교 ›</a>';
function insertVerifiedRates(html,pathname,data){
  const ranked=rankProducts(data.products||[]);
  if(!ranked.length)return null;
  if(pathname==='/finance'){
    if(!html.includes('id="finance-rate-preview" hidden'))return null;
    let output=html.replace('id="finance-rate-preview" hidden',
      'id="finance-rate-preview" data-preloaded="true"');
    output=output.replace('<div class="finance-rate-preview" id="finance-rate-preview" data-preloaded="true"></div>',
      '<div class="finance-rate-preview" id="finance-rate-preview" data-preloaded="true">'
      +renderPreview(ranked,'/')+'</div>');
    output=output.replace('id="finance-rates-official"','id="finance-rates-official" hidden');
    return output;
  }
  if(pathname==='/finance/savings'){
    if(!html.includes('id="finance-rate-panel" aria-labelledby="bank-rates-heading" hidden')
      || !html.includes('<div id="finance-products"></div>'))return null;
    let output=html.replace('id="finance-rate-panel" aria-labelledby="bank-rates-heading" hidden',
      'id="finance-rate-panel" aria-labelledby="bank-rates-heading"');
    output=output.replace('id="finance-rates-official"','id="finance-rates-official" hidden');
    output=output.replace('<div id="finance-products"></div>',
      '<div id="finance-products">'+renderTable(ranked)+'</div>');
    output=output.replace('id="finance-product-criteria"></span>',
      'id="finance-product-criteria">조건에 맞는 공시 상품 '+ranked.length
      +'건'+(ranked.length>80?' · 상위 80건 표시':'')+'</span>');
    output=output.replace('id="finance-products-source"></span>',
      'id="finance-products-source">'+htmlEscape(officialSourceDate(data.retrievedAt))+'</span>');
    const payload=JSON.stringify({products:data.products,retrievedAt:data.retrievedAt})
      .replace(/</g,'\\u003c').replace(/-->/g,'--\\u003e');
    output=output.replace('</head>',
      '<script type="application/json" id="finance-initial-products">'+payload+'</script></head>');
    return output;
  }
  return null;
}
export async function onRequestGet(context){
  const u=new URL(context.request.url);
  if(u.hostname.toLowerCase()==='life.pagero.kr'){
    const redirect=new URL('https://pagero.kr/life'+u.pathname);
    redirect.search=u.search;
    return Response.redirect(redirect.toString(),301);
  }
  const pathname=u.pathname.replace(/\/+$/,'')||'/';
  if(pathname!=='/finance'&&pathname!=='/finance/savings')
    return context.next();
  if(!context.env?.FSS_API_KEY)return context.next();
  const api=new URL('/finance/api/products?kind=deposit&group=bank',u.origin);
  const [page,dataResponse]=await Promise.all([
    context.next(),
    fetchVerifiedProducts({...context,request:new Request(api.toString())})
  ]);
  if(!page.ok || !page.headers.get('content-type')?.includes('text/html')
    || !dataResponse.ok)return page;
  try{
    const data=await dataResponse.json();
    if(data.status!=='ok'||!Array.isArray(data.products)||!data.products.length)
      return page;
    const content=await page.text();
    const updated=insertVerifiedRates(content,pathname,data);
    if(!updated)return new Response(content,page);
    const headers=new Headers(page.headers);
    headers.delete('content-length');
    headers.set('cache-control','public, max-age=60, s-maxage=300');
    headers.set('x-life-finance-initial-rates','verified');
    return new Response(updated,{status:page.status,headers});
  }catch(error){
    console.warn('FSS initial HTML render unavailable',String(error?.message||error));
    return page;
  }
}
