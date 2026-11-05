import { cached, json, finite } from './_shared.js';

// KRX daily indices are gated behind BOTH an approved API key and explicit
// public redisplay authorization. A free data.go.kr key does NOT grant this.
const KRX='https://data-dbg.krx.co.kr/svc/apis/idx/';
const MARKETS=[
  {name:'코스피',path:'kospi_dd_trd',match:/^(코스피|KOSPI)$/i},
  {name:'코스닥',path:'kosdaq_dd_trd',match:/^(코스닥|KOSDAQ)$/i}
];
function kstDate(offset) {
  const date=new Date(Date.now()+9*3600000-offset*86400000);
  return String(date.getUTCFullYear())+
    String(date.getUTCMonth()+1).padStart(2,'0')+
    String(date.getUTCDate()).padStart(2,'0');
}
async function requestIndex(key,market,date) {
  const url=new URL(KRX+market.path);
  url.searchParams.set('basDd',date);
  const response=await fetch(url.toString(),{
    headers:{AUTH_KEY:key,Accept:'application/json'},
    signal:AbortSignal.timeout(7500)
  });
  if(!response.ok)throw Error('KRX_HTTP_'+response.status);
  const payload=await response.json();
  const list=payload?.OutBlock_1;
  if(!Array.isArray(list))throw Error('KRX_INVALID_FORMAT');
  const record=list.find(row=>market.match.test(String(row.IDX_NM||'').trim()));
  if(!record)return null;
  const close=finite(record.CLSPRC_IDX),change=finite(record.FLUC_RT),
    diff=finite(record.CMPPREVDD_IDX);
  if(close==null||close<=0)return null;
  return {
    name:market.name,close,changePercent:change,changePoints:diff,
    baseDate:String(record.BAS_DD||date),
    source:'한국거래소 KRX 일별시세'
  };
}
export async function onRequestGet(context) {
  if(context.env.KRX_PUBLIC_DISPLAY_ALLOWED!=='true'||!context.env.KRX_API_KEY)
    return json({
      status:'unconfigured',source:'한국거래소 KRX',
      message:'KRX 지수 재게시 이용권한과 승인된 API 키가 설정되지 않았습니다.',
      sourceUrl:'https://data.krx.co.kr/',items:[]
    },503);
  return cached(context,'krx-daily-indices',21600,async ()=>{
    const key=String(context.env.KRX_API_KEY);
    // Try the latest available trading day; holidays/weekends are skipped by
    // the upstream KRX data, not guessed from the server clock.
    for(let offset=0;offset<8;offset++){
      const date=kstDate(offset);
      const weekday=new Date(date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T12:00:00+09:00').getUTCDay();
      if(weekday===0||weekday===6)continue;
      const outcomes=await Promise.allSettled(MARKETS.map(m=>requestIndex(key,m,date)));
      const records=outcomes.flatMap(x=>x.status==='fulfilled'&&x.value?[x.value]:[]);
      if(records.length===2) {
        return {
          source:'한국거래소 KRX OPEN API',sourceUrl:'https://data.krx.co.kr/',
          sourceDate:date,delayed:true,items:records,
          note:'장중 실시간 시세가 아니라 마지막으로 수집된 영업일 종가입니다.'
        };
      }
      if(outcomes.some(x=>x.status==='rejected')) {
        const failed=outcomes.find(x=>x.status==='rejected');
        throw Error('KRX_REQUEST_FAILED_'+String(failed.reason?.message||''));
      }
    }
    throw Error('KRX_NO_AVAILABLE_TRADING_DAY');
  });
}
