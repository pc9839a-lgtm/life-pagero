import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT='content/posts/car/';
const date='2026-10-26';
const read=slug=>JSON.parse(fs.readFileSync(ROOT+slug+'.json','utf8'));
const annual=read('car-tax-annual-payment-2026');
const second=read('car-tax-second-half-2026');

for(const p of [annual,second]){
  assert.equal(p.updatedAt,date,p.slug+' corrected content should have a genuine updatedAt');
  assert.equal(p.reviewedAt,date,p.slug+' sources were rechecked on 2026-10-26');
  assert.equal(p.publishedAt === date,false,'Do not disguise corrections as new publication dates');
  assert(p.sources.some(s=>s.checkedAt===date&&new URL(s.url).hostname.endsWith('.go.kr')),p.slug+' needs direct date-reviewed government source');
}
const renderedAnnual=annual.series.parts.map(p=>p.body).join('\n');
const renderedSecond=second.series.parts.map(p=>p.body).join('\n');
const timeless=annual.body+'\n'+annual.keyPoints.join('\n')+'\n'+annual.faqs.map(x=>x.answer).join('\n')+'\n'+renderedAnnual;
for(const outdated of [
 '2026년 7월 현재',
 '2026년 7월 14일 기준으로 1월·3월·6월 신고 기간은 이미 지났습니다',
 '올해 남은 정기 신청 기회는 9월',
 '7월에는 별도의 연납 신청 창구가 열리지 않으므로 지금 즉시',
 '9월에 신청할 예정이라면',
 '9월 신청과 납부 체크리스트',
 '2026년 남은 정기 신청월은 9월입니다',
 '다음 신청 창구인 9월 전에',
]){
 assert(!timeless.includes(outdated),'Expired 2026 filing advice persists: '+outdated);
}
assert(renderedAnnual.includes('2026년 10월 26일 현재 연납 신청은'));
assert(renderedAnnual.includes('12월 제2기분 고지'));
assert(renderedAnnual.includes('2027년 공식'));
assert(renderedSecond.includes('2026년 10월 26일 현재'));
assert(renderedSecond.includes('12월 16~31일'));
assert(annual.faqs.some(x=>x.question.includes('2026년 10월')));
assert(!renderedSecond.includes('2026년 9월 현재'));
assert(annual.series.parts[0].title.includes('마감'));
assert(annual.series.parts[2].title.includes('환급'));
console.log('PASS: 2 historically discovered-not-indexed LIFE tax guides now have current, source-backed deadlines in rendered series, legacy body, summaries and FAQs.');
