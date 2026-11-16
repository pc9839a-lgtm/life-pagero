import test from 'node:test';
import assert from 'node:assert/strict';
import {relatedGuides} from './related-guides.mjs';

const car = (slug,title,keywords=[]) => ({category:'car',slug,title,keywords});
const support = (slug,title,keywords=[]) => ({category:'support',slug,title,keywords});

test('car inspection guides link by editorial journey, not publish date', () => {
  const base=car('car-inspection-period','자동차 검사기간 확인');
  const reservation=car('car-inspection-reservation','자동차 검사 예약');
  const penalty=car('car-inspection-late-penalty','자동차 검사 지연 과태료');
  const irrelevant=car('used-car-transfer-cost','중고차 이전비용');
  const archive=[irrelevant,penalty,base,reservation];
  assert.deepEqual(relatedGuides(base,archive).map(p=>p.slug),
    ['car-inspection-reservation','car-inspection-late-penalty'].sort((a,b) =>
      archive.find(p=>p.slug===a).title.localeCompare(archive.find(p=>p.slug===b).title,'ko')));
});

test('cross-category, noindex and self links are never recommended', () => {
  const base=car('car-inspection-period','정기검사 일정');
  const nonpublic={...car('car-inspection-reservation','정기검사 예약'),noindex:true};
  const other=support('car-inspection-late-penalty','정기검사 지원금',['정기검사']);
  assert.deepEqual(relatedGuides(base,[base,nonpublic,other]),[]);
});

test('semantic keyword overlap links same-category eligible articles', () => {
  const current=support('childcare-guide','육아휴직급여 신청',['육아휴직급여']);
  const related=support('childcare-update','육아휴직급여 제출서류',['육아휴직급여']);
  const unrelated=support('housing-benefit-other','주거급여 신청',['주거급여']);
  assert.deepEqual(relatedGuides(current,[unrelated,related]).map(p=>p.slug),
    ['childcare-update']);
});

test('generic dates, programme category and broad verbs do not create fake relatedness', () => {
  const a=support('a','2026 정부지원 신청 방법',['지원금 신청']);
  const b=support('b','2026 정부지원 신청 조건',['지원금 지급']);
  assert.deepEqual(relatedGuides(a,[b]),[]);
});

test('candidate deduplication, deterministic ordering and limit', () => {
  const a=car('car-inspection-period','검사 기간');
  const b=car('car-inspection-reservation','검사 예약');
  const c=car('car-inspection-late-penalty','검사 과태료');
  const results=relatedGuides(a,[b,b,c,a],1);
  assert.equal(results.length,1);
  assert.notEqual(results[0].slug,a.slug);
});
