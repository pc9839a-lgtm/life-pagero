// Human-curated user journeys supplement editorial keyword matching.
// Only existing indexable articles can be selected; no fabricated links.
export const TOPIC_JOURNEYS = [
  ['car-inspection-period','car-inspection-reservation','car-inspection-late-penalty','car-inspection-fall-check-2026'],
  ['used-car-transfer-documents','used-car-transfer-cost','used-car-online-transfer'],
  ['child-allowance-2026','parental-benefit-2026'],
  ['basic-pension-2026','livelihood-benefit-2026','housing-benefit-2026'],
];

const IGNORE = new Set([
  '2026','2027','2026년','2027년','대상','기준','방법','신청','안내','정리','확인',
  '조회','정보','가이드','준비','서류','지원','정부','생활','절차','금액','조건',
  '상황','비교','계산','지급','이용','가능','변경','신청방법','신청조건',
  '자동차','정부지원','관련','필요','최신','기간','등록','온라인'
]);

const key = (post) => String(post.category || '') + '/' + String(post.slug || '');
const tokens = (post) => {
  const values=[post.title, ...(Array.isArray(post.keywords)?post.keywords:[])].join(' ');
  const words=values.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return new Set(words.filter(word =>
    word.length >= 2 && !IGNORE.has(word) && !/^20\d{2}(?:년)?$/.test(word)
  ));
};
const sharedTerms = (a, b) => {
  const aTerms=tokens(a), bTerms=tokens(b);
  return [...aTerms].filter(word => bTerms.has(word)).length;
};
const curatedRelated = (a, b) => TOPIC_JOURNEYS.some(journey =>
  journey.includes(a.slug) && journey.includes(b.slug));

export function relatedGuides(post, archive, limit = 4) {
  if (!post || !Array.isArray(archive) || limit <= 0) return [];
  const seen = new Set();
  const ranked = [];
  for (const candidate of archive) {
    if (!candidate || candidate.noindex || !candidate.slug || !candidate.category) continue;
    if (key(candidate) === key(post) || seen.has(key(candidate))) continue;
    seen.add(key(candidate));
    // Do not imply that different programmes have equivalent eligibility.
    if (candidate.category !== post.category) continue;
    const curated=curatedRelated(post,candidate);
    const overlap=sharedTerms(post,candidate);
    if (!curated && overlap === 0) continue;
    ranked.push({post:candidate, score:(curated ? 100 : 0) + Math.min(overlap,6)});
  }
  ranked.sort((a,b) =>
    b.score - a.score || a.post.title.localeCompare(b.post.title,'ko')
      || a.post.slug.localeCompare(b.post.slug,'en'));
  return ranked.slice(0,limit).map(item=>item.post);
}
