import { cached, finite, json } from './_shared.js';

// KMA grid reference points (regional representative locations, not GPS).
const CITIES = {
  seoul:{label:'서울',nx:60,ny:127},
  incheon:{label:'인천',nx:55,ny:124},
  suwon:{label:'수원',nx:60,ny:121},
  busan:{label:'부산',nx:98,ny:76},
  daegu:{label:'대구',nx:89,ny:90},
  daejeon:{label:'대전',nx:67,ny:100},
  gwangju:{label:'광주',nx:58,ny:74},
  ulsan:{label:'울산',nx:102,ny:84},
  jeju:{label:'제주',nx:52,ny:38}
};
const SOURCE='https://www.weather.go.kr/w/weather/forecast/short-term.do';
// Short term observations use HH00, often available with a publication delay.
// Use at least 45 minutes lag to avoid claiming missing/unpublished minutes.
function kstBase(now) {
  const local=new Date(now.getTime()+9*3600000);
  local.setUTCMinutes(0,0,0);
  if((now.getTime()+9*3600000-local.getTime())<45*60000)
    local.setUTCHours(local.getUTCHours()-1);
  const year=local.getUTCFullYear(),month=String(local.getUTCMonth()+1).padStart(2,'0'),
    day=String(local.getUTCDate()).padStart(2,'0'),
    hour=String(local.getUTCHours()).padStart(2,'0');
  return {date:String(year)+month+day,time:hour+'00'};
}
export async function onRequestGet(context) {
  const url=new URL(context.request.url);
  const city=url.searchParams.get('city')||'seoul';
  if(!Object.hasOwn(CITIES,city))
    return json({status:'invalid',message:'지원하지 않는 지역입니다.'},400);
  const auth=context.env.KMA_SERVICE_KEY;
  if(!auth)
    return json({status:'unconfigured',city,label:CITIES[city].label,
      source:'기상청 초단기실황',sourceUrl:SOURCE,
      message:'현재 제공 가능한 날씨 자료가 없습니다.'},503);
  return cached(context,'weather-'+city,1800,async () => {
    const coord=CITIES[city],base=kstBase(new Date());
    const api=new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst');
    let key=String(auth).trim();
    if(key.includes('%')) {
      try{key=decodeURIComponent(key);}catch{}
    }
    api.searchParams.set('serviceKey',key);
    api.searchParams.set('pageNo','1');
    api.searchParams.set('numOfRows','25');
    api.searchParams.set('dataType','JSON');
    api.searchParams.set('base_date',base.date);
    api.searchParams.set('base_time',base.time);
    api.searchParams.set('nx',String(coord.nx));
    api.searchParams.set('ny',String(coord.ny));
    const response=await fetch(api.toString(),{
      headers:{Accept:'application/json'},
      signal:AbortSignal.timeout(9500)
    });
    if(!response.ok)throw Error('KMA_HTTP_'+response.status);
    const data=await response.json();
    if(data?.response?.header?.resultCode!=='00')
      throw Error('KMA_RESULT_'+String(data?.response?.header?.resultCode||'unknown'));
    const observations=data?.response?.body?.items?.item;
    if(!Array.isArray(observations)||!observations.length)throw Error('KMA_NO_OBSERVATIONS');
    const values=Object.fromEntries(observations.map(row=>[row.category,row.obsrValue]));
    const temperature=finite(values.T1H);
    if(temperature==null)throw Error('KMA_TEMPERATURE_MISSING');
    const pty=finite(values.PTY);
    const condition=pty===0?'강수 관측 없음':pty===1?'비':pty===2?'비·눈':pty===3?'눈':pty===5?'빗방울':pty===6?'진눈깨비':pty===7?'눈날림':'관측값 확인';
    const obsDate=String(observations[0].baseDate||base.date);
    const obsTime=String(observations[0].baseTime||base.time);
    return {
      city,label:coord.label,source:'기상청 초단기실황',
      sourceUrl:SOURCE,observationDate:obsDate,observationTime:obsTime,
      temperatureC:temperature,humidityPercent:finite(values.REH),
      precipitationMm:finite(values.RN1),windSpeedMs:finite(values.WSD),
      precipitationType:pty,condition,
      note:'지역 대표 관측격자 기준이며, 하늘 상태나 대기질 예보는 포함하지 않습니다.'
    };
  });
}
