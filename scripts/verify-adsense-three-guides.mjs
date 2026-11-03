import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const cases=[
  {slug:'emergency-welfare-livelihood-2026',marker:'상황별 긴급복지 생계지원 판단 비교'},
  {slug:'flu-vaccination-children-2026',marker:'2026-2027절기 무료접종 대상과 기간',reviewDate:'2026-11-03'},
  {slug:'disabled-child-allowance-2026',marker:'장애정도·급여유형별 실제 지원액 비교'},
];
for(const {slug,marker,reviewDate='2026-10-22'} of cases){
  const doc=JSON.parse(fs.readFileSync('content/posts/support/'+slug+'.json','utf8'));
  assert.equal(doc.slug,slug,'Published article identity mismatch: '+slug);
  assert.equal(doc.updatedAt,reviewDate,'Current fact-check date missing: '+slug);
  assert(doc.sources.length>=2,'At least two official citations required: '+slug);
  assert(doc.body.includes(marker),'Editorial decision comparison missing: '+slug);
  assert(doc.body.includes('|---|'),'Practical comparison table missing: '+slug);
  assert(doc.series.parts[0].body.includes(marker),'First indexable article page must include the substantive comparison: '+slug);
  const html=fs.readFileSync(path.join('dist','support',slug,'index.html'),'utf8');
  assert(html.includes(marker)&&html.includes('<table'),'Published first page missing comparison: '+slug);
  assert(html.includes('공식 출처'),'Published article must display official sources');
  console.log('PASS official first-page comparison',slug,'source records',doc.sources.length);
}
const flu=JSON.parse(fs.readFileSync('content/posts/support/flu-vaccination-children-2026.json','utf8'));
const fluPage=fs.readFileSync('dist/support/flu-vaccination-children-2026/index.html','utf8');
for(const old of ['일주일 뒤인 9월 28일','1회 대상이면 9월 28일 이후','접종 시작일은 모두 같지 않습니다']){
  assert(!flu.body.includes(old) && !fluPage.includes(old),'Outdated Sep 28 start date still published: '+old);
}
assert(flu.body.includes('1회 접종 대상 시작일 | 2026년 9월 21일'),'Updated one-dose Sep 21 start date missing');
assert(flu.body.includes('2회 접종 대상 시작일 | 2026년 9월 21일'),'Updated two-dose Sep 21 start date missing');
assert(flu.body.includes('최소 4주 간격'),'Two-dose minimum interval missing');
assert(flu.body.includes('2026년 6월 30일까지 누적 1회'),'Prior-dose eligibility scenario missing');
assert(fluPage.includes('2026-2027절기 무료접종 대상과 기간') && fluPage.includes('최소 4주 간격'),'Updated evidence not rendered on public article');
console.log('PASS three published LIFE guides use first-party evidence; outdated vaccine start date corrected');
