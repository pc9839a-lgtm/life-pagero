import { cached, finite, text } from './_shared.js';

// Public Upbit quotation API, read-only; no trading keys or websocket.
const URL = 'https://api.upbit.com/v1/ticker/all?quote_currencies=KRW';
const KOREAN = {
  BTC:'비트코인',ETH:'이더리움',XRP:'리플',SOL:'솔라나',DOGE:'도지코인',
  ADA:'에이다',SUI:'수이',ONDO:'온도',AVAX:'아발란체',LINK:'체인링크',
  DOT:'폴카닷',TRX:'트론',BCH:'비트코인캐시',XLM:'스텔라루멘'
};
export async function onRequestGet(context) {
  return cached(context,'crypto-top-krw',180,async () => {
    const response = await fetch(URL, {
      headers:{Accept:'application/json','User-Agent':'Life-Pagero-Quote/1.0'},
      signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)throw Error('UPBIT_HTTP_'+response.status);
    const raw=await response.json();
    if(!Array.isArray(raw))throw Error('UPBIT_DATA_INVALID');
    const items=raw.filter(row=>typeof row.market==='string'&&/^KRW-[A-Z0-9]+$/.test(row.market))
      .map(row=>{
        const code=row.market.slice(4);
        const price=finite(row.trade_price),changeRate=finite(row.signed_change_rate),
          volume=finite(row.acc_trade_price_24h),tick=finite(row.timestamp);
        return {
          market:row.market,code,name:KOREAN[code]||code,
          price,changeRate,turnover24h:volume,
          observedAt:tick&&tick>0?new Date(tick).toISOString():null
        };
      })
      .filter(row=>row.price!=null&&row.price>0&&row.turnover24h!=null)
      .sort((a,b)=>b.turnover24h-a.turnover24h).slice(0,12);
    if(items.length<3)throw Error('UPBIT_MARKETS_MISSING');
    return {
      source:'업비트 공개 시세 API',sourceUrl:'https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC',
      market:'KRW',updatedFrom:'거래 시각은 종목별로 다를 수 있습니다.',
      items
    };
  });
}
