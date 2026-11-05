import { createHash } from 'node:crypto';

export const REGION_LABELS = Object.freeze({
  all:'전국',seoul:'서울',busan:'부산',daegu:'대구',incheon:'인천',
  gwangju:'광주',daejeon:'대전',ulsan:'울산',sejong:'세종',gyeonggi:'경기',
  gangwon:'강원',chungbuk:'충북',chungnam:'충남',jeonbuk:'전북',
  jeonnam:'전남',gyeongbuk:'경북',gyeongnam:'경남',jeju:'제주'
});
export const CATEGORY_LABELS = Object.freeze({
  all:'전체',festival:'축제',concert:'공연·콘서트',
  theater:'뮤지컬·연극',exhibition:'전시·체험',other:'기타 문화행사'
});
export const FEE_LABELS = Object.freeze({
  all:'요금 전체',free:'무료',paid:'유료',mixed:'일부 유료',unknown:'요금정보 없음'
});
const aliases = [
  ['seoul',/서울/],['busan',/부산/],['daegu',/대구/],['incheon',/인천/],
  ['gwangju',/광주/],['daejeon',/대전/],['ulsan',/울산/],['sejong',/세종/],
  ['gyeonggi',/경기|수원|성남|고양|용인|화성/],
  ['gangwon',/강원/],['chungbuk',/충북|충청북/],['chungnam',/충남|충청남/],
  ['jeonbuk',/전북|전라북|전북특별/],['jeonnam',/전남|전라남/],
  ['gyeongbuk',/경북|경상북/],['gyeongnam',/경남|경상남/],
  ['jeju',/제주/]
];
export function regionOf(value) {
  const text = String(value || '');
  return aliases.find(([,pattern])=>pattern.test(text))?.[0] || null;
}
export function isoDate(value) {
  const raw = String(value || '').trim();
  const candidate = /^\d{8}$/.test(raw)
    ? raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8)
    : raw.match(/^\d{4}[-.]\d{2}[-.]\d{2}/)?.[0]?.replaceAll('.','-');
  if (!candidate) return null;
  const d = new Date(candidate+'T12:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==candidate ? null : candidate;
}
export function dayShift(iso, days) {
  const d = new Date(iso+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
export function kstToday(now=new Date()) {
  const parts = new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(now);
  const find=key=>parts.find(p=>p.type===key)?.value||'';
  return find('year')+'-'+find('month')+'-'+find('day');
}
export function periodDates(period='this-week', now=kstToday(), from=null, to=null) {
  const today=isoDate(now);
  if (!today) throw new Error('Invalid reference date');
  if (period==='custom') {
    if (!isoDate(from)||!isoDate(to)||from>to||
        (new Date(to)-new Date(from))>1000*60*60*24*366)
      throw new Error('Invalid date range');
    return {from,to};
  }
  const weekDay=(new Date(today+'T12:00:00Z').getUTCDay()+6)%7;
  const monday=dayShift(today,-weekDay);
  if (period==='today') return {from:today,to:today};
  if (period==='tomorrow') {
    const d=dayShift(today,1);return {from:d,to:d};
  }
  if (period==='weekend') return {from:dayShift(monday,5),to:dayShift(monday,6)};
  if (period==='next-week') return {from:dayShift(monday,7),to:dayShift(monday,13)};
  return {from:monday,to:dayShift(monday,6)};
}
export function classifyCategory(value, fallback='other') {
  const s=String(value || '');
  if (/뮤지컬|연극|오페라|아동극/.test(s)) return 'theater';
  if (/전시|체험|교육|미술|박물관|갤러리/.test(s)) return 'exhibition';
  if (/축제|페스티벌|문화제/.test(s)) return 'festival';
  if (/콘서트|음악|클래식|국악|무용|대중음악|공연/.test(s)) return 'concert';
  return fallback;
}
export function classifyFee(value) {
  const s=String(value||'').trim();
  if (!s) return 'unknown';
  const free=/무료|free|전석\s*0원/i.test(s), paid=/유료|[1-9][\d,]*\s*원|₩/i.test(s);
  if (free && paid) return 'mixed';
  if (free) return 'free';
  if (paid) return 'paid';
  return 'unknown';
}
export function officialUrl(value) {
  try {
    const u=new URL(String(value||''));
    if (u.protocol!=='https:' || u.username || u.password) return null;
    return u.toString();
  } catch {return null;}
}
export function clean(value, max=200) {
  return String(value==null?'':value).replace(/<[^>]*>/g,'')
    .replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
export function normalizeEvent(raw) {
  const source=clean(raw.source,30), sourceId=clean(raw.sourceId,100);
  const title=clean(raw.title,120);
  const startDate=isoDate(raw.startDate),endDate=isoDate(raw.endDate);
  if (!source||!sourceId||!title||!startDate||!endDate||startDate>endDate) return null;
  const id='ev-'+createHash('sha256').update(source+':'+sourceId).digest('hex').slice(0,16);
  return {
    id,slug:id,title,source,sourceId,
    startDate,endDate,category:CATEGORY_LABELS[raw.category]?raw.category:classifyCategory(raw.category),
    region:REGION_LABELS[raw.region] && raw.region!=='all'?raw.region:regionOf(raw.region),
    venue:clean(raw.venue,140),address:clean(raw.address,200),
    feeType:FEE_LABELS[raw.feeType]&&raw.feeType!=='all'?raw.feeType:classifyFee(raw.feeText),
    feeText:clean(raw.feeText,140),
    officialUrl:officialUrl(raw.officialUrl),
    scheduleText:clean(raw.scheduleText,200),
    sourceLabel:clean(raw.sourceLabel,60),
    reviewedAt:raw.reviewedAt||null,
    // Never publish third-party posters/photos without verified reuse rights.
    imageUrl:null
  };
}
export function matches(event, filter) {
  if (!event.startDate||!event.endDate ||
      event.startDate>filter.to||event.endDate<filter.from) return false;
  if (filter.region!=='all'&&event.region!==filter.region) return false;
  if (filter.category!=='all'&&event.category!==filter.category)return false;
  if (filter.fee!=='all'&&event.feeType!==filter.fee)return false;
  if (filter.q&&!String(event.title+' '+(event.venue||'')+' '+(event.address||'')).toLowerCase().includes(filter.q.toLowerCase()))return false;
  return true;
}
export function sortEvents(events, today=kstToday()) {
  return [...events].sort((a,b)=>{
    const av=a.startDate<=today&&a.endDate>=today?0:1,
      bv=b.startDate<=today&&b.endDate>=today?0:1;
    const as=av===0?today:a.startDate,bs=bv===0?today:b.startDate;
    return av-bv||as.localeCompare(bs)||a.title.localeCompare(b.title,'ko')||a.id.localeCompare(b.id);
  });
}
