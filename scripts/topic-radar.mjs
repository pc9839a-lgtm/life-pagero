import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT=process.cwd();
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p];
}):[];
const clean=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[e.toLowerCase()]))
  .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const tag=(xml,name)=>clean(xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'');

export function parseFeed(xml){
  return [...String(xml).matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)]
    .map(([,part])=>({
      title:tag(part,'title'),
      link:clean(part.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1]||'')
        ||tag(part,'link')||tag(part,'guid'),
      description:tag(part,'description')||tag(part,'summary'),
      publishedAt:tag(part,'pubDate')||tag(part,'published')||tag(part,'updated'),
    })).filter(x=>x.title&&x.link);
}
export function tokenOverlap(a,b) {
  const words=x=>new Set(String(x||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')
    .split(/\s+/).filter(t=>t.length>=2&&!['2026','2027','최신','확인','방법','안내','신청','지원','정보','정부'].includes(t)));
  const left=words(a),right=words(b);
  if(!left.size||!right.size)return 0;
  return [...left].filter(t=>right.has(t)).length/new Set([...left,...right]).size;
}
function approvedUrl(input,hosts){
  try{
    const u=new URL(input);
    if(!['http:','https:'].includes(u.protocol)
      ||!hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))return null;
    u.protocol='https:';
    return u.href;
  }catch{return null;}
}
function publishedTopics(){
  const items=[];
  for(const filename of walk(path.join(ROOT,'content/posts')).filter(f=>f.endsWith('.json'))){
    try{
      const p=JSON.parse(fs.readFileSync(filename,'utf8'));
      if(!p.noindex)items.push({title:p.title,slug:p.slug,category:p.category,reviewedAt:p.reviewedAt});
    }catch(error){console.warn('Invalid post:',filename,error.message);}
  }
  for(const p of readJson('automation/topic-queue.json')){
    if(!items.some(x=>x.slug===(p.slug||p.id)))items.push({title:p.title,slug:p.slug||p.id,category:p.category,status:p.status});
  }
  return items;
}
const ACTION=/(환급|금리|대출|상환|연말정산|세금|수수료|한도|신용|주택|전세|월세|보증|가계|소득|퇴직|장학|공과금|관리비|자동차|연금|취업|근로|복지|보험료|사업자|지원금|정산|급여|보조금)/;
export function scoreItem(item,groups,existing,now=new Date()){
  // A long statistics-feed description can contain hundreds of unrelated terms.
  // Require the useful intent to appear in the actual headline.
  const text=(item.title||'').trim();
  if(/기본통계|기업생멸행정통계|수록자료|입찰|용역|채용|장관동정|행사 개최|보도설명/.test(text)
    || /\(\s*\d+\s*\)$/.test(text)) return null;
  const matches=groups.map(g=>({...g,hits:g.keywords.filter(k=>text.includes(k))}))
    .filter(g=>g.hits.length).sort((a,b)=>b.hits.length-a.hits.length);
  // Preserve existing editorial exclusion of insurance-related content.
  if(/보험|보험금|보험료/.test(text))return null;
  if(!matches.length||!ACTION.test(text))return null;
  const published=Date.parse(item.publishedAt||'');
  const age=Number.isFinite(published)?Math.floor((now.getTime()-published)/86400000):null;
  if(age!==null&&(age>45||age< -2))return null;
  const similar=existing.map(e=>({...e,similarity:tokenOverlap(e.title,item.title)}))
    .sort((a,b)=>b.similarity-a.similarity)[0];
  if((similar?.similarity||0)>=0.92)return null;
  const g=matches[0];
  const update=(similar?.similarity||0)>=0.35;
  return {
    category:g.label,categoryId:g.id,title:item.title,link:item.link,source:item.source,
    sourceDate:item.publishedAt||null,risk:g.risk,matchedTerms:g.hits,
    action:update?'기존 글 보강 검토':'신규 글 주제 검토',
    existingTitle:update?similar.title:null,
    score:20+Math.min(25,g.hits.length*8)+(age!==null&&age<=7?18:age!==null&&age<=21?10:0)+(update?8:0)-(g.risk==='high'?4:0),
    verified:false,
  };
}
async function loadFeed(feed){
  const response=await fetch(feed.url,{signal:AbortSignal.timeout(14000),redirect:'follow',
    headers:{'user-agent':'Life-Pagero-Topic-Radar/1.0','accept':'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const xml=await response.text();
  if(!/<(?:rss|rdf:RDF|feed|item)\b/i.test(xml))throw Error('XML RSS/Atom feed not recognized');
  return parseFeed(xml).map(item=>({...item,link:approvedUrl(item.link,feed.allowHosts)})).filter(x=>x.link);
}
const escape=s=>String(s||'').replace(/\|/g,'\\|').replace(/\s+/g,' ').trim();
export async function run({now=new Date(),fetcher=loadFeed}={}){
  const feeds=readJson('automation/topic-radar-sources.json').filter(f=>f.enabled!==false);
  const groups=readJson('automation/growth-taxonomy.json');
  const existing=publishedTopics();
  const status=[],found=[];
  for(const feed of feeds){
    try{
      const items=await fetcher(feed);
      status.push({name:feed.name,ok:true,count:items.length});
      if(feed.candidateEligible!==false)found.push(...items.map(x=>({...x,source:feed.name})));
    }catch(e){status.push({name:feed.name,ok:false,count:0,error:String(e.message||e)});}
  }
  const seen=new Set();
  const ranked=found.map(x=>scoreItem(x,groups,existing,now)).filter(Boolean)
    .sort((a,b)=>b.score-a.score).filter(x=>{if(seen.has(x.link))return false;seen.add(x.link);return true;});
  const stale=existing.filter(x=>x.reviewedAt).map(x=>({
    ...x,days:Math.floor((now.getTime()-Date.parse(x.reviewedAt))/86400000)
  })).filter(x=>Number.isFinite(x.days)&&x.days>=21).sort((a,b)=>b.days-a.days).slice(0,15);
  const report={
    generatedAt:now.toISOString(),healthySources:status.filter(x=>x.ok).length,feeds:status,
    candidates:ranked,stale,knownTopics:existing.length,
  };
  const md=[
    '# 생활비서 자동 콘텐츠 레이더',
    '',
    '수집 시각(KST): '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'long',timeStyle:'short'}).format(now),
    '',
    '공식 피드 정상: '+report.healthySources+'/'+feeds.length+' / 기존·대기 글: '+existing.length+'개',
    '',
    '> 후보 점수는 검색량이나 사실 검증이 아니라 공식 자료와 주제의 관련성 지표입니다. 금융·법률·세금 정보는 실제 원문 확인과 사람 검수 후에만 발행하세요.',
    '',
    '## 신규 발행 또는 기존 글 보강 후보',
    '',
    '| 분야 | 공식 자료 제목 | 제안 | 점수 | 원문 |',
    '|---|---|---|---:|---|',
    ...(ranked.slice(0,20).map(x=>'| '+escape(x.category)+' | '+escape(x.title)+' | '+x.action+' | '+x.score+' | [원문]('+x.link+') |')
      ||[]),
    ...(ranked.length?[]:['| - | 관련 후보 없음 | - | - | - |']),
    '',
    '## 기존 글 재확인 우선순위',
    '',
    '| 제목 | 마지막 확인일 | 경과일 |',
    '|---|---|---:|',
    ...stale.slice(0,12).map(x=>'| '+escape(x.title)+' | '+x.reviewedAt+' | '+x.days+' |'),
    ...(stale.length?[]:['| 현재 21일 이상 경과 글 없음 | - | - |']),
    '',
    '## 자료 수집 상태',
    '',
    ...status.map(s=>'- '+(s.ok?'정상':'실패')+': '+s.name+' ('+s.count+'개)'+(s.error?' — '+escape(s.error):'')),
    '',
    ...(report.healthySources===0?['**경고: 모든 소스 실패. 주제 후보가 없는 것으로 판단하지 마세요.**','']:[]),
    '검토 순서: 검색어 성과 확인 → 중복 검색 의도 판별 → 공식 원문 2개 이상 대조 → 계산·비교·절차 추가 → 리뷰 승인 → 게시',
    '',
  ].join('\n');
  return {...report,markdown:md};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const getArg=(name,defaultValue)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:defaultValue;};
  const mdPath=getArg('--out',path.join(ROOT,'topic-radar.md'));
  const jsonPath=getArg('--json',path.join(ROOT,'topic-radar.json'));
  const result=await run();
  for(const target of [mdPath,jsonPath])fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(mdPath,result.markdown,'utf8');
  fs.writeFileSync(jsonPath,JSON.stringify({...result,markdown:undefined},null,2)+'\n','utf8');
  console.log('Official feeds:',result.healthySources,'Candidates:',result.candidates.length,'Stale posts:',result.stale.length);
  if(!result.healthySources)process.exitCode=2;
}