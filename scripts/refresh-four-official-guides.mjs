import fs from 'node:fs';
import path from 'node:path';

// Independent official records checked 2026-11-14 against the respective
// public government pages. The build applies this only AFTER content-bundle
// hydration and the original publisher source/depth improvements.
// Preserve user-facing application workflows, every article slug and all
// earlier claims unless a specific official source demonstrates a correction.
const ROOT = path.resolve('content/posts');
const REVIEWED = '2026-11-14';
const ref = (name, url) => ({name,url,checkedAt:REVIEWED});
const plans = [
  {
    path:'car/car-registration-certificate-reissue.json',
    slug:'car-registration-certificate-reissue',
    sources:[
      ref('자동차365 자동차등록증 재발급 공식 신청대상·인터넷 무료 발급 안내','https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=14'),
      ref('정부24 자동차등록증 재발급 신청·수수료·본인/대리인 제한','https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000338'),
      ref('자동차365 자동차등록원부 발급·열람 별도 민원','https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=15'),
    ],
    note:'## 2026년 11월 공식 비교: 온라인 발급 수수료는 신청 채널별로 다릅니다\n\n[정부24의 자동차등록증 재발급 민원 안내](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000338)는 인터넷 신청 600원, 방문·우편 700원(방문 수령 후불도 700원)을 명시합니다. 반면 [자동차365의 자동차등록증 재발급 안내](https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=14)는 인터넷 발급·열람 수수료를 **무료**로 표시합니다. 이는 서로 다른 공식 신청 채널의 안내이므로 온라인 신청을 모두 600원으로 단정하면 안 됩니다. 본인 신청 가능 여부와 실제 결제·출력 화면을 먼저 확인하고, 원본 제출 필요 여부도 확인하세요.\n\n참고로 [자동차등록원부 발급·열람](https://www.car365.go.kr/ccpt/cvlcpt/guid/detailGuidance.do?cvlcptCd=15)은 등록증 재발급과 별개의 민원입니다. 같은 차량에 관한 문서라도 제출 목적에 맞는 민원을 선택해야 합니다. 공식 안내 확인일: 2026-11-14.',
  },
  {
    path:'support/support-application-documents.json',
    slug:'support-application-documents',
    sources:[
      ref('정부24 사업자등록증명 발급 자격·발급서류·처리기간','https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000016'),
      ref('정부24 국세 납세증명서 발급 및 구비서류','https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000011'),
      ref('정부24 지방세 납세증명서 발급 및 구비서류','https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000056'),
      ref('기업마당 지원사업 공고 검색 방식 공식 FAQ','https://www.bizinfo.go.kr/biz/bizc/selectBIZC300View.do'),
    ],
    note:'## 실제 증명서 이름과 제출처를 구분하는 예시 (2026-11-14 공식 자료 확인)\n\n| 공고에 적힌 서류명 | 확인할 공식 발급 민원 | 지원사업 신청 전 점검 |\n| --- | --- | --- |\n| 사업자등록증명 | [정부24 사업자등록증명 발급](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000016) | 사업자등록증 사본과 다르므로 공고에서 지정한 명칭 확인 |\n| 국세 납세증명서 | [정부24 납세증명서 발급](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000011) | 유효기간과 발급 목적, 신청인 자격 확인 |\n| 지방세 납세증명서 | [정부24 지방세 납세증명서 발급](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000056) | 국세 납세증명서와 서로 다른 민원인 점 확인 |\n\n위 세 서류를 모든 사업에 무조건 제출해야 한다는 뜻은 아닙니다. [기업마당 공식 공고 검색 안내](https://www.bizinfo.go.kr/biz/bizc/selectBIZC300View.do)에서 해당 사업을 찾고 그 공고의 첨부서류 목록과 발급 시점을 우선하세요. 공고가 요구하지 않는 주민등록번호 등 개인정보는 불필요하게 제출하지 마세요.',
  },
  {
    path:'support/government-support-search.json',
    slug:'government-support-search',
    sources:[
      ref('정부24 혜택알리미 서비스 설명·이용 안내','https://plus.gov.kr/portal/benefitV2/benefitSrvcHelp/'),
      ref('복지로 복지서비스 대상별 검색 화면','https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52000M.do'),
      ref('기업마당 지원사업 검색조건 공식 FAQ','https://www.bizinfo.go.kr/biz/bizc/selectBIZC300View.do'),
      ref('기업마당 공공 지원사업 공고 검색 화면','https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'),
      ref('소상공인24 지원대상별 공고·신청 현황','https://www.sbiz24.kr/?menu_id=020300'),
    ],
    note:'## 실제 공식 서비스에서 검색할 때 달라지는 점 (2026-11-14 확인)\n\n[정부24 혜택알리미](https://plus.gov.kr/portal/benefitV2/benefitSrvcHelp/)는 개인 상황에 맞는 혜택을 확인하는 서비스이고, [복지로 서비스 찾기](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52000M.do)는 복지서비스의 대상과 내용 검색에 초점이 있습니다. [기업마당 지원사업 공고](https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do)는 사업명·소관부처·분야·지역 등을 기준으로 확인하고, [소상공인24 지원사업](https://www.sbiz24.kr/?menu_id=020300)는 소상공인 관련 공고와 접수 진행 상황을 확인하는 데 사용합니다.\n\n**실제 확인 예시:** 가구 복지를 찾는 사람은 복지로에서 해당 서비스의 지원대상·선정기준을 먼저 확인하고, 자영업자는 기업마당 공고의 신청기간·지역·제외업종을 검토합니다. 어느 포털에서 찾았든 신청완료를 보장하지 않으며 최종 자격과 제출서류는 개별 공고의 내용이 우선합니다.',
  },
  {
    path:'support/support-eligibility-check.json',
    slug:'support-eligibility-check',
    sources:[
      ref('복지로 2026 지역사회서비스 사업 지원대상·선정기준·지역별 예외','https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00001061&wlfareInfoReldBztpCd=01'),
      ref('복지로 2026 주거급여 지원대상·소득인정액 상세','https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003201&wlfareInfoReldBztpCd=01'),
      ref('기업마당 공식 지원사업 공고 검색 및 부처·지역 필터','https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do'),
      ref('정부24 국세 납세증명서 발급 민원·기준','https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000011'),
    ],
    note:'## 선정기준이 실제로 다른 2026년 공식 사례\n\n| 구분 | 공식 서비스에서 확인되는 차이 | 신청 전 확인 |\n| --- | --- | --- |\n| [지역사회서비스 투자사업](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00001061&wlfareInfoReldBztpCd=01) | 기본 소득기준이 있어도 지역·서비스별 예외와 선정 우선순위가 다를 수 있음 | 지자체별 해당 사업 기준과 모집공고 |\n| [주거급여](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003201&wlfareInfoReldBztpCd=01) | 단순 월급이 아니라 가구의 소득인정액을 기준으로 판단 | 가구원·소득·재산 및 공적 심사 |\n| [기업 지원사업](https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do) | 사업마다 지역·업종·업력·사업자 상태·중복수혜 제한이 다를 수 있음 | 해당 공고문 원문과 첨부 세부 기준 |\n\n국세 체납 제한이 있는 공고라면 [국세 납세증명서 발급](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000011)에서 발급 방법을 확인할 수 있습니다. **이 예시는 각 제도의 판단 방식 비교이며, 복지사업의 모든 기준이 모든 기업지원사업에도 적용된다는 뜻은 아닙니다.** 자료 확인일: 2026-11-14.',
  },
];
const expectedDate = {
'car-registration-certificate-reissue':'2026-10-13',
'support-application-documents':'2026-07-13',
'government-support-search':'2026-07-13',
'support-eligibility-check':'2026-07-13',
};
const carFeeSentence = '정부24 민원 안내에서 자동차등록증 재교부 수수료는 방문·우편 신청 700원, 인터넷 신청 600원으로 안내되는 민원입니다.';
const carFeeNew = '정부24 안내는 인터넷 신청 600원·방문 또는 우편 700원으로 표시하지만, 자동차365 안내는 인터넷 발급·열람 수수료를 무료로 표시합니다. 신청 채널을 먼저 구분해야 합니다.';
const carScenario = '인터넷 신청 수수료는 600원이고, 방문 신청 또는 방문 수령(후불)은 700원입니다.';
const carScenarioNew = '정부24의 인터넷 신청 수수료는 600원이고 방문 또는 방문 수령(후불)은 700원입니다. 자동차365 민원안내에는 인터넷 발급·열람 무료로 표시돼 있으므로 신청 채널의 차이를 확인하세요.';
const carKeyOld='정부24 민원 안내 기준 수수료는 방문·우편 700원, 인터넷 600원이며 결제 직전 공식 화면의 금액을 확인해야 합니다.';
const carKeyNew='정부24는 인터넷 600원·방문 700원, 자동차365는 인터넷 발급·열람 무료로 안내하므로 어느 채널인지 확인해야 합니다.';
let changed=0;
for (const plan of plans) {
  const file=path.join(ROOT,plan.path);
  if(!fs.existsSync(file)) throw Error('[official-refresh] Missing publisher source: '+plan.path);
  const post=JSON.parse(fs.readFileSync(file,'utf8'));
  if(post.slug!==plan.slug || post.noindex) throw Error('[official-refresh] Article identity changed: '+plan.path+' expected='+plan.slug+' ACTUAL='+post.slug+' title='+post.title+' updatedAt='+post.updatedAt+' sources='+JSON.stringify(post.sources));
  if(post.updatedAt!==expectedDate[plan.slug] || !post.reviewedAt) {
    throw Error('[official-refresh] Review/version drift: '+plan.slug+' '+post.updatedAt);
  }
  if (!Array.isArray(post.sources) || post.sources.length < 2 || !String(post.body||'').includes('##')) {
    throw Error('[official-refresh] Unsafe or incomplete article source: '+plan.slug);
  }
  const originalSlug=post.slug;
  const originalCta=JSON.stringify(post.officialCta);
  const originalTitle=post.title;
  const originalBodyLength=post.body.length;
  // Correct the nontrivial discrepancy in official car reissue fees throughout
  // all published body/series copies, instead of only appending a late note.
  if(plan.slug==='car-registration-certificate-reissue'){
    const fixBody=str=>String(str||'').replaceAll(carFeeSentence,carFeeNew).replaceAll(carScenario,carScenarioNew);
    let mentions=0;
    const allText=[post.body,...(post.series?.parts||[]).map(part=>part.body)];
    for(const t of allText) if(String(t||'').includes(carFeeSentence)||String(t||'').includes(carScenario))mentions++;
    if(mentions<2) throw Error('[official-refresh] Expected fee claims no longer found: '+plan.slug);
    post.body=fixBody(post.body);
    for(const part of post.series?.parts||[])part.body=fixBody(part.body);
    if(!post.keyPoints?.includes(carKeyOld)) throw Error('[official-refresh] Car fee key point drift');
    post.keyPoints=post.keyPoints.map(x=>x===carKeyOld?carKeyNew:x);
    for(const part of post.series?.parts||[]){
      part.keyPoints=(part.keyPoints||[]).map(x=>x.replaceAll('공식 민원 안내 기준 수수료는 인터넷 600원, 방문·우편 700원입니다.',carKeyNew));
    }
  }
  if(post.body.includes(plan.note.split('\n')[0])) throw Error('[official-refresh] Duplicate proof section '+plan.slug);
  post.body=post.body.trimEnd()+'\n\n'+plan.note+'\n';
  if(Array.isArray(post.series?.parts) && post.series.parts.length){
    const part=post.series.parts[0];
    if(String(part.body||'').includes(plan.note.split('\n')[0])) throw Error('[official-refresh] Repeated source section '+plan.slug);
    part.body=String(part.body||'').trimEnd()+'\n\n'+plan.note+'\n';
  }
  const urls=new Set(plan.sources.map(x=>x.url));
  if(urls.size!==plan.sources.length || plan.sources.length<2)throw Error('[official-refresh] Duplicate or insufficient official records: '+plan.slug);
  for(const x of plan.sources){
    const u=new URL(x.url);
    if(u.protocol!=='https:' || (u.pathname==='/' && !u.search))throw Error('[official-refresh] Not a directly checkable record '+x.url);
    if(x.checkedAt!==REVIEWED)throw Error('[official-refresh] Source check date mismatch');
  }
  post.sources=plan.sources;
  post.reviewedAt=REVIEWED;
  post.updatedAt=REVIEWED;
  if(post.slug!==originalSlug || post.title!==originalTitle
    || JSON.stringify(post.officialCta)!==originalCta
    || post.body.length < originalBodyLength || !post.sources.length){
    throw Error('[official-refresh] User-facing article unexpectedly changed: '+plan.slug);
  }
  fs.writeFileSync(file,JSON.stringify(post,null,2)+'\n','utf8');
  console.log('[official-refresh] '+plan.slug+' verified '+' sources='+post.sources.length+' original title and CTA preserved');
  changed++;
}
if(changed!==4) throw Error('[official-refresh] Must review exactly four guides');
console.log('[official-refresh] PASS four reviewed official-source articles, channel-specific car fees, and citations 2026-11-14');
