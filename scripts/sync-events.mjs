import fs from 'node:fs';
import path from 'node:path';
import { normalizeEvent, dayShift, kstToday, classifyCategory } from './events-core.mjs';

// Official-source ingestion for the existing static Cloudflare Pages build.
// Never hit a third-party API on visitor requests. API keys belong in Actions secrets.
const DATA = path.resolve('content/events.json');
const previous = JSON.parse(fs.readFileSync(DATA,'utf8'));
const now = new Date().toISOString();
const today = kstToday();
const collected = new Map();
const status = {...(previous.sources||{})};
const failures=[];
const timeout = 18000;

function message(text) {console.log('[events-sync] '+text);}
async function load(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw Error('HTTPS required');
  const response = await fetch(u,{signal:AbortSignal.timeout(timeout),headers:{accept:'application/json,application/xml,text/xml;q=0.9'}});
  if (!response.ok) throw Error('HTTP '+response.status+' from '+u.hostname);
  const body = await response.text();
  if (body.length>8_000_000) throw Error('Oversized API response');
  return body;
}
function xmlEntity(value) {
  return String(value||'').replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,item=>{
    const known={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};
    const key=item.toLowerCase();
    if (key in known) return known[key];
    const code=key.startsWith('&#x')?parseInt(key.slice(3,-1),16):parseInt(key.slice(2,-1),10);
    return Number.isInteger(code)&&code>0&&code<0x110000?String.fromCodePoint(code):'';
  });
}
function field(block,key) {
  const found=block.match(new RegExp('<'+key+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+key+'>','i'));
  return found?xmlEntity(found[1].replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,'')):'';
}
function validRows(rows,source) {
  if (!Array.isArray(rows)) throw Error(source+' response items not an array');
  const events=[];
  for(const r of rows) {
    const event=normalizeEvent({...r,source,reviewedAt:now});
    if(event) events.push(event);
  }
  return events;
}
function replaceSource(source,items) {
  // A zero-row response can mean a provider incident; never erase a populated snapshot.
  if(items.length===0 && previous.events?.some(e=>e.source===source))
    throw Error('Empty source response; retained previous snapshot');
  for(const e of items) collected.set(e.id,e);
  status[source]={lastSuccessAt:now,count:items.length};
  message(source+': '+items.length+' validated events');
}
function asJson(body) {
  let value;
  try{value=JSON.parse(body);}catch{throw Error('Invalid JSON response');}
  return value;
}
async function tour() {
  const key=process.env.TOUR_API_KEY;
  if(!key) return false;
  const from=dayShift(today,-365).replaceAll('-','');
  const to=dayShift(today,183).replaceAll('-','');
  const items=[];
  let total=null;
  for(let page=1;page<=12;page++){
    const url=new URL('https://apis.data.go.kr/B551011/KorService2/searchFestival2');
    for(const [k,v] of Object.entries({
      serviceKey:key,MobileOS:'ETC',MobileApp:'LifePagero',_type:'json',
      eventStartDate:from,eventEndDate:to,numOfRows:'1000',pageNo:String(page)
    }))url.searchParams.set(k,v);
    const data=asJson(await load(url));
    if(data?.response?.header?.resultCode!=='0000' && data?.response?.header?.resultCode!=='00')
      throw Error('TourAPI rejected request: '+String(data?.response?.header?.resultCode||'unknown'));
    const body=data.response?.body;
    const rows=body?.items?.item || [];
    const batch=Array.isArray(rows)?rows:[rows];
    total=Number(body?.totalCount||0);
    for(const r of batch) items.push({
      sourceId:r.contentid,title:r.title,startDate:r.eventstartdate,endDate:r.eventenddate,
      category:'festival',region:r.addr1,venue:r.addr2||r.addr1,
      address:r.addr1,feeText:'',sourceLabel:'한국관광공사 TourAPI',
      officialUrl:null
    });
    if(items.length>=total||batch.length<1000)break;
    if(page===12)throw Error('TourAPI page safety limit reached');
  }
  replaceSource('TOUR',validRows(items,'TOUR'));
  return true;
}
async function kopis() {
  const key=process.env.KOPIS_API_KEY;
  if(!key) return false;
  const items=[];
  // Max 31 calendar days per KOPIS query. Keep long-running productions
  // through the overlap check; never claim every date has a performance.
  for(const offset of [-30,0,30,60]) {
    const start=dayShift(today,offset).replaceAll('-','');
    const end=dayShift(today,offset+29).replaceAll('-','');
    for(let page=1;page<=40;page++) {
      const url=new URL('https://kopis.or.kr/openApi/restful/pblprfr');
      for(const [k,v] of Object.entries({
        service:key,stdate:start,eddate:end,cpage:String(page),rows:'100'
      })) url.searchParams.set(k,v);
      const body=await load(url);
      if(/<error>|<returnAuthMsg>|SERVICE_KEY_IS_NOT_REGISTERED/i.test(body))
        throw Error('KOPIS API returned an error');
      const entries=[...body.matchAll(/<db>([\s\S]*?)<\/db>/gi)].map(m=>m[1]);
      for(const block of entries){
        const genre=field(block,'genrenm');
        items.push({
          sourceId:field(block,'mt20id'),title:field(block,'prfnm'),
          startDate:field(block,'prfpdfrom'),endDate:field(block,'prfpdto'),
          category:classifyCategory(genre,'concert'),
          region:field(block,'area'),venue:field(block,'fcltynm'),
          feeText:field(block,'pcseguidance'),scheduleText:'',
          officialUrl:null,sourceLabel:'KOPIS 공연예술통합전산망'
        });
      }
      if(entries.length<100)break;
      if(page===40)throw Error('KOPIS page safety limit reached');
    }
  }
  replaceSource('KOPIS',validRows(items,'KOPIS'));
  return true;
}
async function seoul() {
  const key=process.env.SEOUL_EVENT_API_KEY;
  if(!key)return false;
  const items=[];
  // Endpoint must support HTTPS; never downgrade to port-8088 HTTP.
  for(let start=1;start<=20001;start+=1000) {
    const end=start+999;
    const url='https://openapi.seoul.go.kr:8088/'+encodeURIComponent(key)+
      '/json/culturalEventInfo/'+start+'/'+end+'/';
    const data=asJson(await load(url));
    const result=data.culturalEventInfo;
    if(!result?.row) {
      if(data.RESULT?.CODE==='INFO-200')break;
      throw Error('Unexpected Seoul culturalEventInfo response');
    }
    for(const r of result.row) {
      items.push({
        sourceId:r.EVENT_ID || r.SEQ || [r.TITLE,r.STRTDATE,r.PLACE].join(':'),
        title:r.TITLE,startDate:r.STRTDATE,endDate:r.END_DATE || r.ENDDATE,
        category:classifyCategory(r.CODENAME+' '+r.TITLE),
        region:'서울',venue:r.PLACE,address:r.ADDRESS,
        feeText:r.USE_FEE||r.USE_TRGT||'',
        feeType:/^무료$/.test(String(r.IS_FREE||'').trim())?'free':
          /^유료$/.test(String(r.IS_FREE||'').trim())?'paid':undefined,
        officialUrl:r.ORG_LINK||r.HMPG_ADDR,
        sourceLabel:'서울시 문화행사 정보'
      });
    }
    if(items.length >= Number(result.list_total_count||0))break;
    if(start===20001)throw Error('Seoul API page safety limit reached');
  }
  replaceSource('SEOUL',validRows(items,'SEOUL'));
  return true;
}

let configured=0, succeeded=0;
for(const [name,fn,key] of [
  ['TOUR',tour,'TOUR_API_KEY'],['KOPIS',kopis,'KOPIS_API_KEY'],
  ['SEOUL',seoul,'SEOUL_EVENT_API_KEY']
]) {
  if (!process.env[key]) {message(name+': credential missing; snapshot unchanged');continue;}
  configured++;
  try{if(await fn())succeeded++;}
  catch(error){failures.push(name+': '+String(error?.message||error));message(name+': fetch failed; retained snapshot');}
}
if(configured===0) {
  message('No free API credentials configured. No event data was fabricated.');
  process.exit(0);
}
// Do not drop events from failed sources. Source metadata records last successes.
const merged=new Map((previous.events||[]).map(e=>[e.id,e]));
for(const key of Object.keys(status)){
  if(status[key]?.lastSuccessAt!==now)continue;
  for(const [id,event] of merged)if(event.source===key)merged.delete(id);
}
for(const [id,e] of collected)merged.set(id,e);
const events=[...merged.values()]
  .filter(e=>e&&e.id&&e.startDate&&e.endDate)
  .sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.id.localeCompare(b.id));
const output={version:1,generatedAt:succeeded?now:previous.generatedAt,sources:status,events};
// Stable unchanged output is written only when a successful import actually changed data.
if(succeeded){
  fs.writeFileSync(DATA,JSON.stringify(output,null,2)+'\n');
  message('Snapshot updated: '+events.length+' records. Sources successful: '+succeeded);
}
if(failures.length){failures.forEach(message);process.exitCode=1;}
