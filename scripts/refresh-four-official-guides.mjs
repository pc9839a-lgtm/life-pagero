import fs from 'node:fs';
import path from 'node:path';

// Publisher source files below are intentionally resolved only AFTER the
// compressed content bundles have been hydrated. Three historical filenames
// are repurposed as newer published 2026 guides. Always guard by actual slug.
// This does not change PageRo SaaS, customer URLs, applications or ad code.
const ROOT=path.resolve('content/posts');
const REVIEW='2026-11-14';
const source=(name,url,checkedAt=REVIEW)=>({name,url,checkedAt});
const plans=[
  {
    file:'car/car-registration-certificate-reissue.json',
    slug:'car-registration-certificate-reissue',
    formerDate:'2026-10-13',
    sources:[
      source('자동차365 자동차등록증 재발급 신청·무료 인터넷 발급 안내','https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=14'),
      source('정부24 자동차등록증 재발급·채널별 수수료·신청자격','https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000338'),
      source('자동차365 자동차등록원부 등본/초본 발급은 별도 민원','https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=15'),
    ],
    note:'## 2026년 11월 공식 확인: 재발급 수수료는 이용 채널에 따라 다릅니다\n\n[정부24 자동차등록증 재발급](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000338)은 인터넷 600원·방문 또는 우편 700원을 안내합니다. 반면 [자동차365 온라인 민원안내](https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=14)는 **인터넷 발급·열람 무료**라고 안내합니다. 따라서 “온라인은 언제나 600원”이라고 일괄 판단하면 안 됩니다. 신청할 공식 서비스와 수령 방법을 구분하고 최종 발급 화면의 수수료를 확인하세요. [등록원부 발급·열람](https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=15)은 등록증 재발급과 별도 서비스입니다. 공식 원문 확인일: 2026-11-14.',
  },
  {
    file:'support/support-application-documents.json',
    slug:'culture-card-2026',
    formerDate:'2026-11-03',
    sources:[
      source('문화누리카드 2026 지원대상·발급·재충전 공식 안내','https://www.mnuri.kr/munhwa/introduceNuri.do'),
      source('문화누리카드 잔액 사용·사용기한·취소 공식 안내','https://www.mnuri.kr/useOfCard/useInfo.do'),
    ],
  },
  {
    file:'support/government-support-search.json',
    slug:'energy-voucher-2026',
    formerDate:'2026-11-03',
    sources:[
      source('에너지바우처 세대별 지원금·지원기간 공식 안내','https://www.energyv.or.kr/info/support_info.do'),
      source('에너지바우처 신청대상·신청기간·신청방법 공식 안내','https://www.energyv.or.kr/info/apl_info.do'),
    ],
  },
  {
    file:'support/support-eligibility-check.json',
    slug:'earned-income-tax-credit-late-2026',
    formerDate:'2026-11-03',
    sources:[
      source('국세청 2025 귀속 근로·자녀장려금 소득·재산 신청요건','https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2449','2026-11-03'),
      source('국세청 2026.11.02 기한 후 신청 12월 1일 마감·95% 지급 공식 보도자료','https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?bbsId=1028&mi=2201&nttSn=1355806'),
    ],
    note:'## 2026년 11월 2일 국세청 보도자료로 마감일 재확인\n\n국세청은 **2025년 귀속 근로·자녀장려금 기한 후 신청을 2026년 12월 1일까지** 받는다고 공식 안내했습니다. 이 신청은 2026년 귀속 상반기 반기신청과 구별해야 합니다. 기한 후 신청으로 산정된 장려금에는 5% 감액(산정액의 95% 지급)이 적용될 수 있으며 심사 결과에 따라 실제 지급액이 달라집니다. 2027년 적용 예정인 소득요건 개편안을 이번 2025년 귀속분에 소급 적용해서는 안 됩니다. [국세청 공식 보도자료](https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?bbsId=1028&mi=2201&nttSn=1355806) (2026-11-14 확인).',
  },
];
const feeOriginal='정부24 민원 안내에서 자동차등록증 재교부 수수료는 방문·우편 신청 700원, 인터넷 신청 600원으로 안내되는 민원입니다.';
const feeUpdated='정부24 안내는 인터넷 신청 600원·방문 또는 우편 700원을 표시하지만, 자동차365 안내는 인터넷 발급·열람을 무료로 표시합니다. 어느 공식 채널에서 신청하는지 먼저 확인해야 합니다.';
const scenarioOriginal='인터넷 신청 수수료는 600원이고, 방문 신청 또는 방문 수령(후불)은 700원입니다.';
const scenarioUpdated='정부24 인터넷 신청 600원, 방문 또는 방문 수령(후불) 700원으로 안내됩니다. 자동차365의 인터넷 발급·열람은 무료로 안내되므로 신청 채널의 차이를 확인하세요.';
const keyOriginal='정부24 민원 안내 기준 수수료는 방문·우편 700원, 인터넷 600원이며 결제 직전 공식 화면의 금액을 확인해야 합니다.';
const keyUpdated='정부24는 인터넷 600원·방문 700원, 자동차365는 인터넷 발급·열람 무료로 안내하므로 채널별 실제 수수료를 확인하세요.';
function replaceFee(txt){
  return String(txt||'').replaceAll(feeOriginal,feeUpdated).replaceAll(scenarioOriginal,scenarioUpdated);
}
function replaceDeadline(txt){
  return String(txt||'').replace(/2026년\s*11월\s*30일/g,'2026년 12월 1일')
    .replace(/11월\s*30일까지/g,'12월 1일까지')
    .replace(/11\.30\.\s*까지/g,'12.1.까지');
}
for (const plan of plans){
  const file=path.join(ROOT,plan.file);
  const p=JSON.parse(fs.readFileSync(file,'utf8'));
  if(p.slug!==plan.slug || p.noindex || p.updatedAt!==plan.formerDate){
    throw Error('[official-refresh] Hydrated article identity/date drift '+plan.file
      +' expected '+plan.slug+'/'+plan.formerDate+' found '+p.slug+'/'+p.updatedAt);
  }
  const existing=Array.isArray(p.sources)?p.sources:[];
  if(existing.length<2)throw Error('[official-refresh] Missing existing official sources '+plan.slug);
  const oldSlug=p.slug,oldTitle=p.title,oldAction=JSON.stringify(p.officialCta);
  if(plan.slug==='car-registration-certificate-reissue'){
    const text=[p.body,...(p.series?.parts||[]).map(z=>z.body)];
    if(!text.some(z=>String(z).includes(feeOriginal))
      ||!text.some(z=>String(z).includes(scenarioOriginal))
      ||!p.keyPoints?.includes(keyOriginal)){
      throw Error('[official-refresh] Existing car fee assertions drifted; refusing blind change');
    }
    p.body=replaceFee(p.body);
    for(const part of p.series?.parts||[]){
      part.body=replaceFee(part.body);
      part.keyPoints=(part.keyPoints||[]).map(x=>x.replaceAll('공식 민원 안내 기준 수수료는 인터넷 600원, 방문·우편 700원입니다.',keyUpdated));
    }
    p.keyPoints=p.keyPoints.map(x=>x===keyOriginal?keyUpdated:x);
  }
  if(plan.slug==='earned-income-tax-credit-late-2026'){
    p.body=replaceDeadline(p.body);
    p.description=replaceDeadline(p.description);
    p.keyPoints=(p.keyPoints||[]).map(replaceDeadline);
    for(const part of p.series?.parts||[]){
      part.body=replaceDeadline(part.body);
      part.description=replaceDeadline(part.description);
      part.keyPoints=(part.keyPoints||[]).map(replaceDeadline);
    }
    p.faqs=(p.faqs||[]).map(x=>({...x,question:replaceDeadline(x.question),answer:replaceDeadline(x.answer)}));
  }
  if(plan.note){
    const title=plan.note.split('\n')[0];
    if(p.body.includes(title))throw Error('[official-refresh] Duplicate note '+plan.slug);
    p.body=p.body.trimEnd()+'\n\n'+plan.note+'\n';
    if(p.series?.parts?.length){
      const first=p.series.parts[0];
      if(String(first.body||'').includes(title))throw Error('[official-refresh] Duplicate series note '+plan.slug);
      first.body=String(first.body||'').trimEnd()+'\n\n'+plan.note+'\n';
    }
  }
  if(plan.slug==='culture-card-2026'){
    if(!existing.some(s=>s.url==='https://www.mnuri.kr/munhwa/cardIssueGuide.do'
      && s.checkedAt==='2026-07-13')) throw Error('[official-refresh] Expected old culture citation changed');
  }
  if(plan.slug==='energy-voucher-2026'){
    if(!existing.some(s=>s.url==='https://www.energyv.or.kr/info/apl_info.do'
      && s.checkedAt==='2026-07-13')) throw Error('[official-refresh] Expected old energy citation changed');
  }
  if(plan.slug==='earned-income-tax-credit-late-2026'){
    if(!existing.some(s=>s.url==='https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=238977&mi=40397'
      && s.checkedAt==='2026-07-13')) throw Error('[official-refresh] Expected old NTS citation changed');
  }
  if(plan.sources.length<2||new Set(plan.sources.map(x=>x.url)).size!==plan.sources.length)
    throw Error('[official-refresh] Insufficient distinct official references '+plan.slug);
  for(const rec of plan.sources){
    const u=new URL(rec.url);
    if(u.protocol!=='https:'||(u.pathname==='/'&&!u.search)
      ||Date.parse(rec.checkedAt)<Date.parse('2026-11-01')){
      throw Error('[official-refresh] Unsupported official citation '+plan.slug+' '+rec.url);
    }
  }
  p.sources=plan.sources;
  p.updatedAt=REVIEW;
  p.reviewedAt=REVIEW;
  if(p.slug!==oldSlug||p.title!==oldTitle||JSON.stringify(p.officialCta)!==oldAction)
    throw Error('[official-refresh] Title, slug or application CTA changed '+plan.slug);
  fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n','utf8');
  console.log('[official-refresh] PASS '+plan.slug+' source_count='+p.sources.length+' revised='+REVIEW);
}
console.log('[official-refresh] PASS four published guides; original CTA/URLs preserved, car fee conflict corrected.');
