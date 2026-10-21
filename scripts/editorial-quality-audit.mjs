import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('content/posts');
const files = fs.readdirSync(ROOT, { recursive: true }).filter(x => x.endsWith('.json') && !x.startsWith('.')).sort();
const rows = [];
const paragraphIndex = new Map();
const today = new Date();
const dateAge = date => {
  const val = Date.parse(date || '');
  return Number.isFinite(val) ? Math.floor((today.getTime() - val) / 86400000) : null;
};

for (const file of files) {
  const p = path.join(ROOT, file);
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const body = String(doc.body || '').trim();
  const sources = Array.isArray(doc.sources) ? doc.sources : [];
  const allParagraphs = body.split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const paragraph of allParagraphs) {
    if (paragraph.length < 90 || paragraph.startsWith('#')) continue;
    if (!paragraphIndex.has(paragraph)) paragraphIndex.set(paragraph, []);
    paragraphIndex.get(paragraph).push(file);
  }
  const homepageSources = sources.filter(s => {
    try {return ['/', ''].includes(new URL(s.url).pathname) && !new URL(s.url).search;} catch {return false;}
  });
  const commonSources = sources.filter(s => /^(?:https?:\/\/)?(?:www\.)?(?:gov\.kr|plus\.gov\.kr|www\.car365\.go\.kr)\/?$/i.test(s.url || ''));
  const staleDates = sources.filter(s => (dateAge(s.checkedAt) ?? -1) > 120);
  const hasMoneyClaim = /\d[\d,.]*(?:원|만원|%|개월|세|일)/.test(body);
  const scenarios = (body.match(/(?:사례|예시|상황\s?\d|비교표|체크리스트|계산|표\s?\d)/g) || []).length;
  const specificSiteLinks = (body.match(/https?:\/\/[^\s)\]]+/g) || []).length;
  const issues = [];
  if (body.length < 1600) issues.push('shorter_than_1600_chars');
  if (sources.length < 2) issues.push('fewer_than_two_sources');
  if (sources.length && homepageSources.length === sources.length) issues.push('all_sources_are_homepages');
  if (homepageSources.length) issues.push('homepage_source_instead_of_direct_record');
  if (staleDates.length) issues.push('source_check_over_120_days_old');
  if ((dateAge(doc.reviewedAt) ?? -1) > 120) issues.push('reviewed_over_120_days_ago');
  if (scenarios === 0) issues.push('no_explicit_case_comparison_or_checklist');
  if (hasMoneyClaim && sources.length === 0) issues.push('uncited_numeric_claims');
  rows.push({file,title:doc.title,chars:body.length,source_count:sources.length,home_sources:homepageSources.map(s => s.url),source_names:sources.map(s => s.name),source_age_max:Math.max(...sources.map(s => dateAge(s.checkedAt) ?? 0), 0),reviewed_at:doc.reviewedAt || '',scenarios,official_links_in_body:specificSiteLinks,issues});
}
const duplicated = [...paragraphIndex.entries()]
 .filter(([paragraph, docs]) => new Set(docs).size > 1)
 .map(([paragraph, docs]) => ({excerpt:paragraph.slice(0,180),files:[...new Set(docs)]}))
 .sort((a,b) => b.files.length-a.files.length);
for (const row of rows) {
  const affected = duplicated.filter(d => d.files.includes(row.file));
  if (affected.length) row.issues.push('shared_paragraphs_across_articles:' + affected.length);
  row.issue_count = row.issues.length;
}
rows.sort((a,b) => b.issue_count-a.issue_count || a.chars-b.chars);
const summary = {
  scope:'Automated editorial triage, not an AdSense decision or plagiarism verification',
  article_count:rows.length,
  flagged:rows.filter(x => x.issues.length).length,
  reviewed_over_120_days:rows.filter(x => x.issues.includes('reviewed_over_120_days_ago')).length,
  any_homepage_source:rows.filter(x => x.home_sources.length).length,
  common_paragraph_count:duplicated.length,
  repeated_paragraph_examples:duplicated.slice(0,15),
  articles:rows,
};
fs.writeFileSync('editorial-quality-report.json', JSON.stringify(summary,null,2),'utf8');
console.log('LIFE ARTICLES: ' + summary.article_count +
  ' | flagged: ' + summary.flagged + 
  ' | shared paragraphs: ' + duplicated.length +
  ' | generic homepage sources: ' + summary.any_homepage_source);
for (const row of rows.slice(0,30)) {
  console.log([row.issue_count + ' signals', row.chars + ' chars', row.source_count + ' sources', row.file, row.issues.join(', ')].join(' | '));
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines=['## Editorial content triage (not an AdSense score)','',
   'Articles: **'+summary.article_count+'** · Flagged for human review: **'+summary.flagged+'** · Shared long paragraphs: **'+duplicated.length+'**','',
   '| Post | Characters | Sources | Signals |',
   '|---|---:|---:|---|',
   ...rows.slice(0,35).map(r => '| ' + r.file + ' | ' + r.chars + ' | '+r.source_count+' | '+r.issues.join(', ')+' |'),
   '', 'Checks cannot prove original research, legal accuracy, source validity or approval likelihood. Human verification is required.'];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
}