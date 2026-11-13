import fs from 'node:fs';
import path from 'node:path';

// Only remove known redundant citations AFTER the publisher's existing
// compressed-content and official-source curation stages have completed.
// Never treat a changed build date as a source-review date.
// Four articles already cite multiple independently reviewed direct records.
// The old sources below are redundant homepage/older references, NOT
// replacement evidence. This script only trims those exact URLs.
// Explicit guards prevent accidental mass-pruning if a publisher source drifts.
const ROOT = process.cwd();
const MIN_DIRECT_REVIEW = '2026-10-21';
const plans = [
  {
    "path": "content/posts/car/car-tax-annual-payment-2026.json",
    "slug": "car-tax-annual-payment-2026",
    "remove": [
      "https://www.paju.go.kr/news/user/BD_newsView.do?newsSeq=1138&q_ctgCd=1001",
      "https://www.wetax.go.kr/",
      "https://www.law.go.kr/법령/지방세법/제128조",
      "https://www.law.go.kr/lsInfoP.do?lsId=001649"
    ],
    "retain": [
      "https://www.110.go.kr/data/counselView.do?curPage=18&num=A01_660057&scCate1=&scCate2=&scIntt=&scText=&scType=",
      "https://www.seocho.go.kr/site/tax/03/10303010000002023050810.jsp",
      "https://www.suwon.go.kr/sw-www/deptHome/dep_tax/tax01/eco04_03_05.jsp"
    ]
  },
  {
    "path": "content/posts/support/ev-subsidy-search.json",
    "slug": "ev-subsidy-search",
    "remove": [
      "https://ev.or.kr/",
      "https://www.me.go.kr/",
      "https://www.ev.or.kr/nportal/main.do"
    ],
    "retain": [
      "https://ev.or.kr/nportal/buySupprt/initSubsiGuideAction.do",
      "https://ev.or.kr/nportal/buySupprt/initSubsidyPaymentCheckAction.do"
    ]
  },
  {
    "path": "content/posts/support/car-tax-relief-guide.json",
    "slug": "car-tax-relief-guide",
    "remove": [
      "https://www.wetax.go.kr/",
      "https://www.law.go.kr/법령/지방세특례제한법"
    ],
    "retain": [
      "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=02&joNo=0022&lsiSeq=286607&urlMode=lsScJoRltInfoR",
      "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000064&HighCtgCD=A09002"
    ]
  },
  {
    "path": "content/posts/support/tenant-movein-fixed-date-rent-report-2026.json",
    "slug": "tenant-movein-fixed-date-rent-report-2026",
    "remove": [
      "https://rtms.molit.go.kr/"
    ],
    "retain": [
      "https://www.gwanak.go.kr/site/gwanak/07/10705110000002021052709.jsp",
      "https://www.anyang.go.kr/main/contents.do?key=4349",
      "https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=3&cnpClsNo=1&csmSeq=629&popMenu=ov"
    ]
  }
];

for (const plan of plans) {
  const file = path.join(ROOT,plan.path);
  const post = JSON.parse(fs.readFileSync(file,'utf8'));
  if (post.slug !== plan.slug) throw Error('[citation-prune] Unexpected article slug '+plan.path);
  if (!Array.isArray(post.sources)) throw Error('[citation-prune] Missing sources '+plan.slug);
  const current = post.sources.map(s=>s.url);
  for (const url of plan.retain) {
    if (current.filter(x=>x===url).length!==1) throw Error('[citation-prune] Missing reviewed direct reference '+plan.slug+' '+url);
  }
  // Earlier official-source curators may have already retired some of these
  // homepage links; allow that one known cleanup, but never unknown records.
  for (const url of plan.remove) {
    if (current.filter(x=>x===url).length>1) throw Error('[citation-prune] Duplicate retired reference '+plan.slug+' '+url);
  }
  const additional = current.filter(url=>![...plan.remove,...plan.retain].includes(url));
  if (additional.length) {
    // New or bundled official records must remain intact. Prune only exact
    // previously agreed obsolete citations and surface additional records in CI.
    console.log('[citation-prune] Preserved '+additional.length+' added source(s) in '+plan.slug+': '+additional.join(' | '));
  }
  for (const source of post.sources.filter(s=>plan.retain.includes(s.url))) {
    if (!source.name || !source.checkedAt || source.checkedAt < MIN_DIRECT_REVIEW) {
      throw Error('[citation-prune] No sufficiently recent reviewed direct source '+plan.slug+' '+source.url);
    }
    const parsed = new URL(source.url);
    if (parsed.protocol!=='https:' || (parsed.pathname==='/' && !parsed.search)) {
      throw Error('[citation-prune] Refusing generic homepage as retained evidence '+plan.slug+' '+source.url);
    }
  }
  const oldBody = post.body;
  const oldSeries = JSON.stringify(post.series);
  const oldDate = post.updatedAt;
  const oldReviewed = post.reviewedAt;
  const removed = post.sources.filter(s=>plan.remove.includes(s.url)).length;
  post.sources = post.sources.filter(s=>!plan.remove.includes(s.url));
  if (post.sources.length < 2 || post.body!==oldBody || JSON.stringify(post.series)!==oldSeries
      || post.updatedAt!==oldDate || post.reviewedAt!==oldReviewed) {
    throw Error('[citation-prune] Unexpected substantive content change '+plan.slug);
  }
  fs.writeFileSync(file,JSON.stringify(post,null,2)+'\n','utf8');
  console.log('[citation-prune] '+plan.slug+': removed '+removed+' remaining redundant citations; retained '+post.sources.length+' direct official records');
}
console.log('[citation-prune] PASS: Four existing guides retain factual text, original review dates, and multiple direct records.');
