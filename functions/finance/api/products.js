// Cloudflare Pages Function. FSS_API_KEY is a Cloudflare Pages secret
// (never placed in browser HTML or checked into Git).
const allow = new Set(['deposit','saving']);
const groups = { bank:'020000', savingsbank:'030300' };
const urls = {
  deposit: 'depositProductsSearch.json',
  saving: 'savingProductsSearch.json'
};
const json = (data,status=200,age=0) => new Response(JSON.stringify(data),{
  status, headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':status===200?'public, max-age=60, s-maxage='+age:'no-store',
    'X-Content-Type-Options':'nosniff',
    'Access-Control-Allow-Origin':'https://pagero.kr'
  }
});
const trim = (v, n=500) => String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n);
const numericRate = v => v==null || v==='' ? null
  : Number.isFinite(Number(v)) ? Number(v) : null;
async function readPage(key,kind,group,page) {
  const u = new URL('https://finlife.fss.or.kr/finlifeapi/'+urls[kind]);
  u.searchParams.set('auth',key);
  u.searchParams.set('topFinGrpNo',groups[group]);
  u.searchParams.set('pageNo',String(page));
  const res = await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!res.ok) throw new Error('FSS_HTTP_'+res.status);
  const payload=await res.json();
  const data=payload?.result;
  if(!data || !Array.isArray(data.baseList) || !Array.isArray(data.optionList))
    throw new Error('FSS_RESPONSE_INVALID');
  if(data.err_cd && Number(data.err_cd)!==0)
    throw new Error('FSS_ERROR_'+String(data.err_cd).slice(0,12));
  return data;
}
export async function onRequestGet(context) {
  const url=new URL(context.request.url);
  const kind=url.searchParams.get('kind')||'deposit';
  const group=url.searchParams.get('group')||'bank';
  if(!allow.has(kind)||!Object.hasOwn(groups,group))
    return json({status:'invalid',message:'상품 종류 또는 금융권 조건이 올바르지 않습니다.'},400);
  const key=context.env.FSS_API_KEY;
  if(!key)
    return json({status:'unconfigured',source:'금융감독원 금융상품한눈에',
      message:'현재 제공 가능한 공시 자료가 없습니다.',
      officialUrl:'https://finlife.fss.or.kr/'},503);
  const cacheKey=new Request(url.toString(),{method:'GET'});
  const cache=typeof caches==='object'&&caches.default?caches.default:null;
  const cached=cache?await cache.match(cacheKey):null;
  if(cached) return cached;
  try{
    const first=await readPage(key,kind,group,1);
    const max=Math.min(8,Math.max(1,Number(first.max_page_no)||1));
    const pages=[first];
    for(let offset=2;offset<=max;offset+=3){
      const indexes=Array.from({length:Math.min(3,max-offset+1)},(_,i)=>offset+i);
      const found=await Promise.all(indexes.map(index=>readPage(key,kind,group,index)));
      pages.push(...found);
    }
    const base=new Map(), options=[];
    for(const page of pages){
      for(const b of page.baseList){
        const id=trim(b.fin_co_no,30)+'|'+trim(b.fin_prdt_cd,40);
        base.set(id,b);
      }
      options.push(...page.optionList);
    }
    const seen=new Set();
    const products=options.flatMap(o=>{
      const id=trim(o.fin_co_no,30)+'|'+trim(o.fin_prdt_cd,40);
      const b=base.get(id);
      if(!b || !o.save_trm) return [];
      const term=Number(o.save_trm);
      if(!Number.isInteger(term)||term<=0||term>120)return [];
      const code=id+'|'+term+'|'+trim(o.intr_rate_type,12)+'|'+trim(o.rsrv_type,12);
      if(seen.has(code)) return [];
      seen.add(code);
      return [{
        bank:trim(b.kor_co_nm,90),product:trim(b.fin_prdt_nm,140),
        term,baseRate:numericRate(o.intr_rate),maxRate:numericRate(o.intr_rate2),
        joinWay:trim(b.join_way,120),preferential:trim(b.spcl_cnd,700),
        earlyTermination:trim(b.mtrt_int,500),
        rateType:trim(o.intr_rate_type_nm,50),
        reserveType:trim(o.rsrv_type_nm,60),
        disclosedMonth:trim(b.dcls_month,6),
        disclosureDate:trim(b.dcls_strt_day,8),
        updatedAt:trim(b.fin_co_subm_day,16)
      }];
    });
    if(!products.length)throw new Error('FSS_EMPTY');
    const response=json({
      status:'ok',source:'금융감독원 금융상품한눈에',kind,group,
      retrievedAt:new Date().toISOString(),
      returnedPages:pages.length,mayBeTruncated:pages.length<(Number(first.max_page_no)||1),
      count:products.length,products
    },200,900);
    if(cache)context.waitUntil(cache.put(cacheKey,response.clone()));
    return response;
  }catch(error){
    console.error('FSS product data unavailable',String(error?.message||error));
    return json({status:'unavailable',source:'금융감독원 금융상품한눈에',
      message:'현재 공시 데이터를 불러오지 못했습니다. 공식 비교공시에서 확인하세요.',
      officialUrl:'https://finlife.fss.or.kr/'},502);
  }
}
