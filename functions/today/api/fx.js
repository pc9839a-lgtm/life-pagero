import { cached, finite } from './_shared.js';

// European Central Bank daily reference rates distributed by Frankfurter v1.
// One request for the EUR-based rates keeps every cross-rate on the same date;
// inverted KRW-based rates would lose precision for currencies like JPY.
// This is NOT a live executable bank rate, remittance quote or intraday trade.
const URL='https://api.frankfurter.dev/v1/latest?base=EUR&symbols=KRW,USD,JPY,CNY';
const SOURCE='https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';
const CURRENCIES=[
  {code:'USD',name:'미국 달러',unit:1},
  {code:'JPY',name:'일본 엔',unit:100},
  {code:'EUR',name:'유로',unit:1},
  {code:'CNY',name:'중국 위안',unit:1}
];

export async function onRequestGet(context) {
  return cached(context,'fx-ecb-krw-reference',86400,async()=>{
    const response=await fetch(URL,{
      headers:{Accept:'application/json','User-Agent':'Life-Pagero-FX/1.0'},
      signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)throw Error('FX_HTTP_'+response.status);
    const data=await response.json();
    if(data?.base!=='EUR'||!/^\d{4}-\d{2}-\d{2}$/.test(data?.date||''))
      throw Error('FX_REFERENCE_DATE_INVALID');
    const rates=data.rates;
    const krw=finite(rates?.KRW);
    if(krw==null||krw<=0)throw Error('FX_KRW_MISSING');
    const items=CURRENCIES.map(({code,name,unit})=>{
      const quote=code==='EUR'?1:finite(rates?.[code]);
      if(quote==null||quote<=0)throw Error('FX_QUOTE_MISSING_'+code);
      const won=krw/quote*unit;
      if(!Number.isFinite(won)||won<=0)throw Error('FX_CROSS_RATE_INVALID_'+code);
      return {code,name,unit,krw:won};
    });
    return {
      source:'유럽중앙은행(ECB) 참고환율 · Frankfurter',
      sourceUrl:SOURCE,
      sourceDate:data.date,
      delayed:true,
      note:'마지막 발표 영업일의 참고환율입니다. 실시간 시세 또는 은행 매매·송금 환율이 아닙니다.',
      items
    };
  },{staleSeconds:604800,retrySeconds:600});
}
