import fs from 'node:fs';
import path from 'node:path';

// Explicit, publisher-reviewed citation cleanup. These are the 18 article
// identities actually published AFTER content-bundle hydration, not old file
// names (some old file names have been repurposed for a different article).
const expectedHome = new Map(Object.entries({
  'car-inspection-fall-check-2026': ['https://www.cyberts.kr/'],
  'car-joint-ownership-change': ['https://www.car365.go.kr/', 'https://www.wetax.go.kr/'],
  'car-inspection-period': ['https://www.cyberts.kr/', 'https://www.car365.go.kr/'],
  'car-tax-second-half-2026': ['https://chatbot.wetax.go.kr/'],
  'culture-card-2026': ['https://www.mnuri.kr/'],
  'energy-voucher-2026': ['https://www.bokjiro.go.kr/'],
  'earned-income-tax-credit-late-2026': ['https://www.hometax.go.kr/'],
  'used-car-transfer-documents': ['https://www.gov.kr/'],
  'small-business-management-voucher-2026': ['https://voucher.sbiz24.kr/'],
  'car-inspection-reservation': ['https://www.cyberts.kr/', 'https://www.car365.go.kr/'],
  'car-inspection-late-penalty': ['https://www.cyberts.kr/'],
  'ev-subsidy-search': ['https://www.me.go.kr/'],
  'used-car-transfer-cost': ['https://www.wetax.go.kr/'],
  'car-scrap-deregistration-tax-refund': ['https://www.wetax.go.kr/'],
  'used-car-online-transfer': ['https://www.gov.kr/'],
  'car-registration-certificate-reissue': ['https://www.car365.go.kr/'],
  'car-tax-relief-guide': ['https://www.wetax.go.kr/'],
  'car-tax-annual-payment-2026': ['https://www.wetax.go.kr/'],
}));

// Official record pages checked independently on 2026-10-23.
// Each replaces a non-evidentiary homepage reference, not a service action.
const directAdditions = {
  'car-inspection-period': [
    {name: '한국교통안전공단 정기검사 법적 근거·검사항목', url: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200', checkedAt: '2026-10-23'},
    {name: '한국교통안전공단 종합검사 대상지역·배출가스 검사', url: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010300', checkedAt: '2026-10-23'},
  ],
  'culture-card-2026': [
    {name: '문화누리카드 2026 사업대상·지원금액·추가지원', url: 'https://www.mnuri.kr/munhwa/introduceNuri.do', checkedAt: '2026-11-03'},
    {name: '문화누리카드 잔액 사용·기한·취소 안내', url: 'https://www.mnuri.kr/useOfCard/useInfo.do', checkedAt: '2026-11-03'},
  ],
  'energy-voucher-2026': [
    {name: '2026 에너지바우처 세대별 연간 지원금·사용기간', url: 'https://www.energyv.or.kr/info/support_info.do', checkedAt: '2026-11-03'},
  ],
  'earned-income-tax-credit-late-2026': [
    {name: '국세청 근로·자녀장려금 2025 귀속 소득·재산 신청요건', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2449', checkedAt: '2026-11-03'},
  ],
};

const additions = {
  'used-car-transfer-cost': `## 이전비용 계산 결과와 실제 납부액은 다를 수 있습니다 (2026년 10월 23일 확인)

자동차365의 **중고차 등록비용 간편계산**은 일반인(비장애인)·비영업용 차량을 기준으로 한 참고값입니다. 계산 화면에는 취득세, 지역별 공채 매입 또는 할인 비용 등이 나오지만, 인지대·번호판대·등록대행료는 별도이고 차량 조건·지역·시점에 따라 실제 금액이 달라질 수 있습니다.

| 비교 대상 | 자동차365 계산기에 포함·반영되는 내용 | 따로 확인할 항목 |
|---|---|---|
| 직접 이전등록을 진행하는 개인 | 차량가격·지역·차종 기준 예상 취득세·공채 | 인지·증지, 번호판 제작 등 기타 실제 등록비 |
| 판매점이 '이전비 포함'이라고 안내한 차량 | 법정 등록비의 예상 구성 | 등록 대행료, 관리비 등 판매점 청구액이 섞였는지 |
| 친환경차나 감면 자격이 있는 구매자 | 계산기상 표시되는 감면 항목 | 실제 감면 적용 대상 및 시점별 법령 |
| 지역을 바꿔 등록할 수 있는 경우 | 지역별 예상 공채 등 차이 | 실제 등록 가능한 지역과 당시 공채 할인율 |

**가상 비교:** 판매자가 '이전비 100만 원'이라고 제시했다고 해서 모두 취득세라고 판단할 수 없습니다. 자동차365의 예상 등록비를 기준으로 법정 항목을 먼저 확인하고, 판매점이 별도로 요구하는 비용은 견적서에서 구분해야 합니다. 위 숫자 100만 원은 설명을 위한 임의 사례로 실제 차량의 과세·등록비가 아닙니다.

[자동차365 중고차 등록비용 간편계산](https://www.car365.go.kr/ccpt/schdcar/trde/regCstCalcView.do?_menuId=M630403000&moblYn=Y) · [정부24 취득세 신고 민원 안내](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000064&HighCtgCD=A09002)`,
  'car-inspection-period': `## 내 차량의 정기검사·종합검사 구분 사례 (2026년 10월 23일 확인)

자동차검사는 예약 전 **차량 종류와 등록지역**을 먼저 확인해야 합니다. 한국교통안전공단에 따르면 정기검사는 자동차관리법에 따른 기본 검사이고, 종합검사는 대상지역과 해당 차령 조건을 충족하는 차량에 적용되며 배출가스 정밀검사 등이 포함됩니다.

| 확인할 상황 | 우선 확인할 정보 | 근거 자료 |
|---|---|---|
| 비사업용 승용차의 검사기간을 조회 | 차량번호·최초등록일·차량 용도 | 정기검사 공식 대상 안내 |
| 종합검사 대상 지역에 등록된 차량 | 사용본거지·차령·차종·대상지역 | 종합검사 공식 대상 안내 |
| 예약하려는 검사소가 해당 차량을 취급하는지 불확실 | 검사 종류 조회 후 검사소의 차종별 검사 가능 여부 | 사이버검사소 공식 예약 서비스 |

**판단 예시:** 같은 차종·연식 차량이라도 등록지역이 다르면 종합검사 적용 여부가 달라질 수 있습니다. 다른 사람의 검사 통지서 날짜나 블로그의 일괄 주기표만 보고 예약하지 말고, 본인 차량의 공식 조회 결과를 먼저 확인하세요. 이는 임의 사례이며 특정 차량의 검사기한을 대신 계산한 것이 아닙니다.

[정기검사 공식 설명](https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200) · [종합검사 공식 설명](https://main.kotsa.or.kr/portal/contents.do?menuCode=01010300)`,
  'culture-card-2026': `## 2026 문화누리카드: 발급은 11월 30일까지, 사용은 12월 31일까지 (2026년 11월 3일 확인)

문화누리카드는 **카드 발급·재충전 마감일과 이미 받은 지원금 사용 종료일이 다릅니다.** 공식 [2026 사업안내](https://www.mnuri.kr/munhwa/introduceNuri.do)와 [사용안내](https://www.mnuri.kr/useOfCard/useInfo.do)를 구분해 확인하세요.

| 해야 할 일 | 2026년 공식 기한·조건 |
| --- | --- |
| 신규발급·재충전 | 2026년 11월 30일까지 |
| 받은 지원금 사용 | 2026년 12월 31일까지 |
| 1인당 기본지원 | 연간 150,000원 |
| 추가 지원 가능 출생연도 | 2008~2013년 / 1962~1966년 |
| 추가 지원액 | 해당자 10,000원(예산 소진 여부에 따름) |
| 기본 이용자격 | 2020년 12월 31일 이전 출생한 6세 이상 기초생활수급자·차상위계층 |

**가상 사례 A:** 2012년생 자녀가 지원 대상 가구에 속한다면 **기본 15만원 + 생애주기 1만원 추가** 대상 범위를 검토할 수 있습니다. 단, 추가 지원예산이 소진됐으면 기본 지원만 가능할 수 있고, 본인 수급자격도 확인해야 합니다. 출생연도만으로 지원금 지급을 확정해선 안 됩니다.

**가상 사례 B:** 2025년에 문화누리카드 지원금을 3만원 이상 사용했고 올해도 자격이 유지됐다면 2026년 자동재충전이 됐는지 조회할 필요가 있습니다. 카드 유효기간 만료, 복지시설 발급, 사용실적 부족 등 제외사유가 있으면 자동재충전되지 않았을 수 있습니다. **예전에 카드가 있었다는 사실만으로 올해 충전 완료를 추정하면 안 됩니다.**

**가상 사례 C:** 2026년 12월 말에 잔액을 사용하려는 이용자는 아직 카드를 발급받지 않았다면 11월 30일 기한을 먼저 확인해야 합니다. 발급받은 카드의 지원금 잔액도 **12월 31일 이후 자동으로 이월되지 않습니다.** 여행·공연·운동 관련 결제 취소는 가맹점과 카드사 정산에 시간이 걸릴 수 있어 마감 직전 결제·취소를 반복하는 것은 위험합니다.

### 상황별 다음 행동

| 지금 상태 | 확인할 순서 |
| --- | --- |
| 올해 처음 신청 | 수급 자격 → 발급기한 → 발급 방법 |
| 이전 카드 보유 | 올해 자동재충전 여부 → 카드 상태 → 잔액 |
| 청소년·준고령 추가지원 대상 | 출생연도·기본자격 → 추가지원금 반영 여부 |
| 기존 카드 잔액 보유 | 공식 가맹점 확인 → 12월 31일 사용기한 |
| 카드 분실·훼손 | 카드 번호 유형별 재발급 방법·마감일 확인 |

문화누리카드는 국내 문화예술·관광·체육활동의 **지정 가맹점**에서 사용하는 카드이며 임의의 모든 상점에서 사용할 수 있는 현금지원이 아닙니다. 최종 지원금액과 잔액은 공식 사이트에서 직접 확인하세요.

[2026 발급·재충전 상세 안내](https://www.mnuri.kr/munhwa/introduceNuri.do) · [지원금 사용기한·취소 안내](https://www.mnuri.kr/useOfCard/useInfo.do) · 고객지원센터 **1544-3412**. 확인일: **2026년 11월 3일**.`,
  'energy-voucher-2026': `## 11월 에너지바우처: 신청·사용·재신청 구분 (2026년 11월 3일 확인)

2026년 에너지바우처는 **월 지급금이 아니라 세대원 수별 연간 총액**입니다. 11월 기준 새로 신청할 수 있는 기간과 이미 지급받은 바우처의 사용기간도 다릅니다. [공식 지원내용](https://www.energyv.or.kr/info/support_info.do)과 [신청안내](https://www.energyv.or.kr/info/apl_info.do)를 나눠 확인해야 합니다.

| 구분 | 2026년 공식 기준 | 11월에 할 일 |
| --- | --- | --- |
| 신청 마감 | 2026년 12월 31일 | 자격·신청 여부 확인 |
| 겨울 요금차감(가상카드) | 2026년 10월 1일~2027년 5월 31일 | 전기·도시가스·지역난방 고지서 확인 |
| 겨울 실물카드 | 2026년 10월 3일~2027년 5월 31일 | 국민행복카드 이용 방식 확인 |
| 1인 세대 연간 총액 | 295,200원 | 세대원 특성·기존 다른 에너지 지원 확인 |
| 2인 세대 연간 총액 | 407,500원 | 세대원수·자동신청 여부 확인 |
| 3인 세대 연간 총액 | 532,700원 | 실제 주민등록 세대원수 확인 |
| 4인 이상 연간 총액 | 701,300원 | 4인 이상 금액이 일률적임을 확인 |

**가상 사례 A:** 2025년에 지원받았고 2026년에도 자격과 세대 정보가 그대로라면 자동신청 대상일 수 있습니다. 그러나 **이사했거나 세대원 수가 바뀌었다면 신규신청·재신청이 필요한지** 주민센터에서 확인해야 합니다. 지난해 수급자였다는 이유만으로 올해도 자동 처리됐다고 단정하면 안 됩니다.

**가상 사례 B:** 도시가스 요금 고지서에서 겨울철 요금차감을 원하는 가구는 가상카드 방식에 필요한 **최근 에너지 요금고지서 또는 아파트 관리비 고지서**와 고객번호 등을 확인합니다. 실물카드로 등유·LPG 등을 구입하려는 가구라면 사용 방식 자체가 달라집니다. 신청 시 어떤 에너지를 이용하는지와 사용 방식을 구분해야 합니다.

**중복지원 예외:** 공식 안내는 2026년 10월~2027년 3월 긴급복지 동절기 연료비를 받은 경우 등 **동절기 에너지바우처와 중복할 수 없는 지원**을 명시합니다. 복지 수급자라면 누구나 에너지바우처를 자동으로 받는 것도 아닙니다. 생계·의료·주거·교육급여 수급 조건 외에 세대원의 노인·영유아·장애·임신 등 **특성요건**도 확인해야 합니다.

[공식 금액·기간·중복지원 기준](https://www.energyv.or.kr/info/support_info.do) · [자동·신규·재신청 방법](https://www.energyv.or.kr/info/apl_info.do)

신청 완료 여부와 세대 변경은 관할 읍·면·동 행정복지센터 또는 에너지바우처 상담센터 **1600-3190**에서 확인하세요. 이 글의 11월 사례는 실제 신청·수급 이력을 꾸민 것이 아닌 설명용 가정입니다.`,
  'earned-income-tax-credit-late-2026': `## 2026년 11월 근로장려금 기한 후 신청: 12월 1일 마감 (2026년 11월 3일 확인)

국세청은 **2025년 연간 소득**에 대한 **2026년 기한 후 신청기간을 6월 2일~12월 1일**로 안내합니다. 11월에 검색할 때는 **2026년 상반기 근로소득 반기신청**과 혼동하지 않는 것이 중요합니다. 공식 [신청기간·방법](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=238977&mi=40397)을 기준으로 시기를 구분했습니다.

| 신청 유형 | 산정하는 소득 | 공식 신청 시기 | 2026년 11월에 판단할 것 |
| --- | --- | --- | --- |
| 2025년 귀속 정기신청 | 2025년 연간 근로·사업·종교인 소득 | 2026.5.1.~6.1. | 정기기간은 종료 |
| 2025년 귀속 기한 후 신청 | 2025년 연간 소득 | 2026.6.2.~12.1. | 아직 신청기간 |
| 2026년 상반기 반기신청 | 2026년 상반기 근로소득 | 2026.9.1.~9.15. | 별도 대상·기간, 현재 종료 |
| 2026년 하반기 반기신청 | 2026년 하반기 근로소득 | 2027.3.1.~3.15. | 내년 신청 일정 |

**가상 사례 A:** 2025년에 근로소득과 사업소득이 함께 있었는데 2026년 5월 정기신청을 놓친 사람이라면, 2025년 연간 소득에 대한 **기한 후 신청** 대상인지 먼저 검토합니다. 국세청은 사업소득·종교인소득이 있는 사람은 정기신청 방식으로 안내하고 있습니다. '반기신청을 지금 하면 된다'고 안내하는 것은 잘못입니다.

**가상 사례 B:** 2026년 상반기 근로소득만 있는 사람이 2026년 9월 반기신청을 놓쳤다면 2025년 귀속 기한 후 신청을 대신 할 수 있는 것이 아닙니다. **귀속연도가 다른 두 제도**이므로 홈택스에서 정확한 소득 귀속연도와 신청유형을 확인해야 합니다.

국세청은 안내문을 받은 경우 개별인증번호를 이용한 신청, 안내문이 없는 경우 본인인증 후 직접 신청 경로를 제공합니다. **안내문 미수령은 무조건 신청 불가라는 뜻이 아닙니다.** 홈택스에서 세대원·소득·재산을 확인하고 신청요건을 검토해야 합니다.

| 실제 점검할 항목 | 확인해야 할 자료 |
| --- | --- |
| 가구유형 | 단독·홑벌이·맞벌이 여부 |
| 총소득 | 2025년 귀속 근로·사업·종교인 소득 |
| 재산 | 국세청이 정한 기준일의 가구원 재산 합계 |
| 신청유형 | 정기·기한 후·반기 중 어느 유형인지 |
| 신청완료 | 홈택스 신청내역과 계좌·연락처 |

가구별 소득기준·재산·감액 사유는 [국세청 공식 자격 설명](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2449)에서 확인하세요. 신청기간 안이라는 사실이 지급을 보장하지는 않습니다. **11월 3일 확인 자료 기준**이며 최종 신청 결과와 지급액은 국세청 결정이 우선합니다.`,
};

const TODAY = '2026-10-23';
// A later, fully reviewed inspection cluster supersedes the October
// one-time citation cleanup. Protect the primary source record and the
// articles' unique user intent; still fail closed on weak evidence.
const NEWER_REVIEWED_INSPECTION = new Set([
  'car-inspection-period',
  'car-inspection-reservation',
  'car-inspection-late-penalty',
  'car-inspection-fall-check-2026',
]);
const root = path.resolve('content/posts');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
  const full = path.join(dir,e.name);
  return e.isDirectory() ? walk(full) : [full];
});
const posts = walk(root).filter(x => x.endsWith('.json'));
const bySlug = new Map();
for (const file of posts) {
  const post = JSON.parse(fs.readFileSync(file,'utf8'));
  if(bySlug.has(post.slug)) throw Error('Duplicate published slug: '+post.slug);
  bySlug.set(post.slug,{file,post});
}
if(bySlug.size !== 45) throw Error('Unexpected published count '+bySlug.size);
const originalActions = new Map();
const changed = [];

for (const [slug, retireUrls] of expectedHome.entries()) {
  const entry = bySlug.get(slug);
  if (!entry) throw Error('Source cleanup target no longer published: '+slug);
  const {file,post} = entry;
  const existing = Array.isArray(post.sources) ? post.sources : [];
  if (!post.officialCta?.href) throw Error('Missing official service/action link: '+slug);
  originalActions.set(slug,JSON.stringify(post.officialCta));

  if (NEWER_REVIEWED_INSPECTION.has(slug)
      && Date.parse(post.reviewedAt || '') > Date.parse(TODAY)) {
    const verified = existing.filter(s => {
      try {
        const u = new URL(s.url);
        return u.protocol === 'https:' && u.pathname !== '/'
          && (u.hostname.endsWith('.kotsa.or.kr') || u.hostname.endsWith('.gov.kr') || u.hostname.endsWith('.go.kr'))
          && Date.parse(s.checkedAt || '') >= Date.parse('2026-10-21');
      } catch { return false; }
    });
    if (verified.length < 2) throw Error('Newer inspection guide lacks two verified direct sources: ' + slug);
    if (retireUrls.some(url => existing.some(s => s.url === url))) {
      throw Error('Newer inspection guide still contains superseded portal homepage citations: ' + slug);
    }
    if (!post.series?.parts || post.series.parts.length !== 3
        || post.series.parts.some(p => (p.body || '').length < 1000)) {
      throw Error('Newer inspection guide missing substantive parts: ' + slug);
    }
    changed.push({slug,removed:0,remaining:existing.length,portal:post.officialCta.href,comparison:true,preservedNewerReview:true});
    console.log('SOURCE_PRECISION',JSON.stringify(changed.at(-1)));
    continue;
  }

  const missing = retireUrls.filter(url => !existing.some(s=>s.url===url));
  if(missing.length) throw Error('Publisher source list drift for '+slug+': '+missing.join(', '));
  for (const url of retireUrls) {
    const u = new URL(url);
    if(u.protocol !== 'https:' || u.pathname !== '/' || u.search) {
      throw Error('Refusing to remove non-homepage citation '+slug+' '+url);
    }
  }
  const newRecords = directAdditions[slug] || [];
  for(const record of newRecords) {
    const u = new URL(record.url);
    if(u.protocol !== 'https:' || u.pathname==='/' || !/^(?:(?:[a-z0-9-]+\.)*(?:go\.kr|or\.kr|gov\.kr)|www\.mnuri\.kr)$/.test(u.hostname)) {
      throw Error('Replacement requires specific official record '+slug+' '+record.url);
    }
  }
  const all = [...newRecords,...existing.filter(s=>!retireUrls.includes(s.url))];
  const unique = [...new Map(all.map(s=>[s.url,s])).values()];
  const direct = unique.filter(s=>{
    try {const u=new URL(s.url);return u.protocol==='https:' && (u.pathname!=='/'||u.search);}
    catch {return false}
  });
  if(direct.length < 2) throw Error('Insufficient specific official records after cleanup: '+slug);
  if(!unique.length) throw Error('Sources may not be emptied for '+slug);
  post.sources = unique;

  const text = additions[slug];
  if(text){
    const heading = text.split('\n')[0].trim();
    if (!Array.isArray(post.series?.parts) || !post.series.parts[0]) throw Error('No indexable primary article section: '+slug);
    for(const field of [post,post.series.parts[0]]){
      if(!String(field.body||'').includes(heading)) field.body=String(field.body||'').trimEnd()+'\n\n'+text+'\n';
    }
    const effectiveReviewDate = ['energy-voucher-2026','earned-income-tax-credit-late-2026','culture-card-2026'].includes(slug) ? '2026-11-03' : TODAY;
    post.updatedAt = effectiveReviewDate;
    post.reviewedAt = effectiveReviewDate;
  }
  if(JSON.stringify(post.officialCta)!==originalActions.get(slug)) throw Error('Official application link changed on '+slug);
  fs.writeFileSync(file,JSON.stringify(post,null,2)+'\n','utf8');
  changed.push({slug,removed:retireUrls.length,remaining:post.sources.length,portal:post.officialCta.href,comparison:!!text});
  console.log('SOURCE_PRECISION',JSON.stringify(changed.at(-1)));
}
if(changed.length!==18)throw Error('All 18 source rows must be audited');
console.log('SOURCE_PRECISION_SUMMARY',JSON.stringify({
  articlesReviewed:changed.length,
  redundantAgencyHomepagesRetired:changed.reduce((n,x)=>n+x.removed,0),
  practicalComparisons:changed.filter(x=>x.comparison).length,
  officialServiceLinksPreserved:changed.length,
}));
