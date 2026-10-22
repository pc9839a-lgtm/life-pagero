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
    {name: '문화누리카드 2026 사업대상·지원금액·추가지원', url: 'https://www.mnuri.kr/munhwa/introduceNuri.do', checkedAt: '2026-10-23'},
    {name: '문화누리카드 잔액 사용·기한·취소 안내', url: 'https://www.mnuri.kr/useOfCard/useInfo.do', checkedAt: '2026-10-23'},
  ],
  'energy-voucher-2026': [
    {name: '2026 에너지바우처 세대별 연간 지원금·사용기간', url: 'https://www.energyv.or.kr/info/support_info.do', checkedAt: '2026-10-23'},
  ],
  'earned-income-tax-credit-late-2026': [
    {name: '국세청 근로·자녀장려금 2025 귀속 소득·재산 신청요건', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2449', checkedAt: '2026-10-23'},
  ],
};

const additions = {
  'car-inspection-period': `## 내 차량의 정기검사·종합검사 구분 사례 (2026년 10월 23일 확인)

자동차검사는 예약 전 **차량 종류와 등록지역**을 먼저 확인해야 합니다. 한국교통안전공단에 따르면 정기검사는 자동차관리법에 따른 기본 검사이고, 종합검사는 대상지역과 해당 차령 조건을 충족하는 차량에 적용되며 배출가스 정밀검사 등이 포함됩니다.

| 확인할 상황 | 우선 확인할 정보 | 근거 자료 |
|---|---|---|
| 비사업용 승용차의 검사기간을 조회 | 차량번호·최초등록일·차량 용도 | 정기검사 공식 대상 안내 |
| 종합검사 대상 지역에 등록된 차량 | 사용본거지·차령·차종·대상지역 | 종합검사 공식 대상 안내 |
| 예약하려는 검사소가 해당 차량을 취급하는지 불확실 | 검사 종류 조회 후 검사소의 차종별 검사 가능 여부 | 사이버검사소 공식 예약 서비스 |

**판단 예시:** 같은 차종·연식 차량이라도 등록지역이 다르면 종합검사 적용 여부가 달라질 수 있습니다. 다른 사람의 검사 통지서 날짜나 블로그의 일괄 주기표만 보고 예약하지 말고, 본인 차량의 공식 조회 결과를 먼저 확인하세요. 이는 임의 사례이며 특정 차량의 검사기한을 대신 계산한 것이 아닙니다.

[정기검사 공식 설명](https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200) · [종합검사 공식 설명](https://main.kotsa.or.kr/portal/contents.do?menuCode=01010300)`,
  'culture-card-2026': `## 발급·자동재충전·연말 사용기한 비교 (2026년 10월 23일 확인)

2026년 문화누리카드 기본 지원금은 **1인당 연 15만 원**입니다. 청소년기(2008~2013년 출생)와 준고령기(1962~1966년 출생)에 해당하면 예산 범위 내에서 **1만 원이 추가**될 수 있습니다. 자동재충전, 신규발급, 잔액 사용은 서로 다른 절차입니다.

| 상황 | 확인해야 할 내용 | 마감·주의사항 |
|---|---|---|
| 2025년 카드가 있고 3만 원 이상 사용했으며 자격 유지 | 자동재충전 결과 확인 | 자동재충전 대상에서 제외될 수도 있으므로 개인 상태 확인 |
| 2026년 신규 발급 또는 재충전 필요 | 주민센터·공식 누리집 등 이용 | 발급 신청은 2026년 11월 30일까지, 예산 소진 시 조기 종료 가능 |
| 이미 발급받은 카드로 결제하려는 경우 | 공식 가맹점·잔액·유효기간 확인 | 2026년 12월 31일 이후 미사용 잔액은 이월되지 않음 |

**이용 예시:** 지난해 카드를 받았던 A씨와 올해 처음 신청하는 B씨는 자격이 같더라도 신청 절차가 다릅니다. A씨는 자동재충전 여부부터 확인하고, B씨는 발급 신청 기간을 먼저 확인해야 합니다. 또 발급마감과 사용마감은 다른 날짜입니다.

[2026 문화누리카드 사업 및 추가지원](https://www.mnuri.kr/munhwa/introduceNuri.do) · [공식 사용·잔액 유의사항](https://www.mnuri.kr/useOfCard/useInfo.do)`,
  'energy-voucher-2026': `## 에너지바우처는 월 지급액이 아닌 연간 총액입니다 (2026년 10월 23일 확인)

에너지바우처 공식 2026년 안내에서 지원금은 **월별 지급이 아닌 해당 연도의 세대별 총액**입니다. 1인 295,200원, 2인 407,500원, 3인 532,700원, 4인 이상 701,300원입니다. 소득기준과 세대원 특성기준을 모두 충족해야 하며, 다른 연료비 지원과 중복 여부 등에 따라 예외가 적용될 수 있습니다.

| 세대 상황 | 2026년 기본 총액 | 실제 확인할 조건 |
|---|---:|---|
| 1인 세대 | 295,200원 | 세대원 특성기준과 수급 자격 |
| 2인 세대 | 407,500원 | 가구원 수 및 대상 자격 |
| 3인 세대 | 532,700원 | 변경된 가구원 수 반영 여부 |
| 4인 이상 | 701,300원 | 소득·세대원 요건과 다른 이용권 중복 |

**사용시기 비교:** 하절기는 2026년 7월 1일~9월 30일 요금차감, 동절기는 가상카드 기준 2026년 10월 1일~2027년 5월 31일, 실물카드 기준 2026년 10월 3일~2027년 5월 31일입니다. 10월에 잔액을 확인하는 이용자는 신청자격뿐 아니라 결제방식과 적용 고지서의 청구일도 확인해야 합니다.

[2026 세대별 지원금·이용기간 공식 안내](https://www.energyv.or.kr/info/support_info.do) · [공식 신청 안내](https://www.energyv.or.kr/info/apl_info.do)`,
  'earned-income-tax-credit-late-2026': `## 기한 후 신청 전 가구유형·총소득·재산 비교 (2026년 10월 23일 확인)

국세청의 **2025년 귀속 소득분에 대한 2026년 정기·기한 후 신청**은 신청 기한과 자격 판단이 별개입니다. 정기신청은 2026년 5월 1일~6월 1일이었고, 기한 후 신청 기간은 2026년 6월 2일~12월 1일입니다.

| 2025년 귀속 근로장려금 가구유형 | 부부합산 총소득 기준금액 | 추가로 확인해야 할 조건 |
|---|---:|---|
| 단독가구 | 2,200만 원 미만 | 가구원 구성, 신청자격 제외 사유 |
| 홑벌이가구 | 3,200만 원 미만 | 배우자·부양가족 정의와 소득 |
| 맞벌이가구 | 4,400만 원 미만 | 부부 각각의 소득, 가구 재산 |

**재산 요건:** 2025년 6월 1일 기준 가구원 재산 합계가 **2억 4천만 원 미만**이어야 하며, 1억 7천만 원 이상인 경우 지급액이 일부 감액될 수 있습니다. 부채는 해당 재산 기준을 계산할 때 차감하지 않는다고 국세청은 안내합니다.

**가상 사례:** A씨는 기한 후 신청 마감 전이지만 가구 구성과 총소득, 재산 기준 중 하나라도 충족하지 못하면 신청기한이 남았다는 이유만으로 지급이 결정되지 않습니다. 신청기간은 국세청 안내에서, 신청자격은 같은 기관의 자격 안내에서 각각 확인하세요.

[국세청 2026년 신청기간·방법](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=238977&mi=40397) · [국세청 근로·자녀장려금 신청자격](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2449)`,
};

const TODAY = '2026-10-23';
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
    if(u.protocol !== 'https:' || u.pathname==='/' || !/^(?:[a-z0-9-]+\.)*(?:go\.kr|or\.kr|gov\.kr)$/.test(u.hostname)) {
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
    post.updatedAt = TODAY;
    post.reviewedAt = TODAY;
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
