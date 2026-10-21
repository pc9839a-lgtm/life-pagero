import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('content/posts');
const files = fs.readdirSync(ROOT, { recursive: true }).filter((file) => file.endsWith('.json'));
const slugs = new Set();
const titles = new Set();
const errors = [];

const officialHosts = [
  'go.kr',
  'gov.kr',
  'or.kr',
  'car365.go.kr',
  'cyberts.kr',
  'ev.or.kr',
  'mecar.or.kr',
  'bizinfo.go.kr',
  'sbiz24.kr',
  'bokjiro.go.kr',
  'wetax.go.kr',
  'nts.go.kr',
  'hometax.go.kr',
  'mnuri.kr',
  'energyv.or.kr',
  'law.go.kr',
  'me.go.kr',
  'plus.gov.kr',
];

const banned = [
  '정부 공식 사이트입니다',
  '100% 지급',
  '무조건 지급',
  '승인 보장',
  '공식 지원센터',
  '하나의 콘텐츠를 단계별로 나누어 안내합니다.',
];

const required = [
  'title',
  'description',
  'slug',
  'category',
  'publishedAt',
  'updatedAt',
  'reviewedAt',
  'author',
  'keywords',
  'keyPoints',
  'sources',
  'faqs',
  'body',
  'series',
  'officialCta',
];

function isOfficialUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
    return officialHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

for (const relative of files) {
  const file = path.join(ROOT, relative);
  let data;

  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${relative}: invalid JSON (${error.message})`);
    continue;
  }

  for (const key of required) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      errors.push(`${relative}: missing ${key}`);
    }
  }

  if (!data.title || data.title.length < 12) errors.push(`${relative}: title too short`);
  if (!data.description || data.description.length < 45 || data.description.length > 180) {
    errors.push(`${relative}: description must be 45-180 chars`);
  }
  if (!/^[a-z0-9-]+$/.test(data.slug || '')) errors.push(`${relative}: invalid slug`);
  if (!['car', 'support'].includes(data.category)) errors.push(`${relative}: invalid category`);
  if (slugs.has(data.slug)) errors.push(`${relative}: duplicate slug`);
  else slugs.add(data.slug);
  if (titles.has(data.title)) errors.push(`${relative}: duplicate title`);
  else titles.add(data.title);

  if ((data.body || '').length < 3000) errors.push(`${relative}: body too thin (${(data.body || '').length})`);
  if (!Array.isArray(data.keywords) || data.keywords.length < 3) errors.push(`${relative}: at least 3 keywords required`);
  if (!Array.isArray(data.keyPoints) || data.keyPoints.length < 3) errors.push(`${relative}: at least 3 key points required`);
  if (!Array.isArray(data.faqs) || data.faqs.length < 2) errors.push(`${relative}: at least 2 FAQs required`);
  if (!Array.isArray(data.sources) || data.sources.length < 1) errors.push(`${relative}: source required`);

  const parts = data.series?.parts;
  if (!Array.isArray(parts) || parts.length !== 3) {
    errors.push(`${relative}: series must contain exactly 3 parts`);
  } else {
    parts.forEach((part, index) => {
      const label = `series part ${index + 1}`;
      if (!part.title || part.title.length < 8) errors.push(`${relative}: ${label} title too short`);
      if (!part.description || part.description.length < 35 || part.description.length > 180) {
        errors.push(`${relative}: ${label} description must be 35-180 chars`);
      }
      if (!Array.isArray(part.keyPoints) || part.keyPoints.length < 3) {
        errors.push(`${relative}: ${label} needs at least 3 key points`);
      }
      if (!part.body || part.body.length < 1000) {
        errors.push(`${relative}: ${label} body too thin (${(part.body || '').length})`);
      }
      if (!part.image || !/^https:\/\//.test(part.image)) {
        errors.push(`${relative}: ${label} HTTPS image required`);
      }
      if (!part.imageAlt || part.imageAlt.length < 10) {
        errors.push(`${relative}: ${label} imageAlt required`);
      }
      if (index < 2 && (!part.nextLabel || part.nextLabel.length < 6)) {
        errors.push(`${relative}: ${label} nextLabel required`);
      }
    });

    const totalSeriesLength = parts.reduce((sum, part) => sum + (part.body || '').length, 0);
    if (totalSeriesLength < 3000) errors.push(`${relative}: series total body too thin (${totalSeriesLength})`);
  }

  if (!data.officialCta?.href || !/^https:\/\//.test(data.officialCta.href)) {
    errors.push(`${relative}: official HTTPS CTA required`);
  } else if (!isOfficialUrl(data.officialCta.href)) {
    errors.push(`${relative}: official CTA host is not allowlisted (${data.officialCta.href})`);
  }

  const sourceUrls = (data.sources || []).map((source) => source.url).filter(Boolean);
  if (!sourceUrls.some(isOfficialUrl)) {
    errors.push(`${relative}: official source required`);
  }

  // New articles are held to substantive-source standards. Legacy content is
  // reported by scripts/editorial-quality-audit.mjs instead of silently deleted.
  if ((data.publishedAt || '') >= '2026-10-21') {
    const primarySources = (data.sources || []).filter(source => {
      if (!isOfficialUrl(source.url)) return false;
      try {
        const uri = new URL(source.url);
        return (uri.pathname && uri.pathname !== '/') || Boolean(uri.search);
      } catch {return false;}
    });
    const distinct = new Set(primarySources.map(source => source.url));
    if (distinct.size < 2) {
      errors.push(relative + ': new article needs at least 2 distinct direct official source URLs; homepage URLs alone are insufficient');
    }
    const pubTime = Date.parse(data.publishedAt || '');
    for (const source of primarySources) {
      const checked = Date.parse(source.checkedAt || '');
      if (!Number.isFinite(checked) || !Number.isFinite(pubTime)
          || Math.abs(pubTime - checked) > 31 * 86400000) {
        errors.push(relative + ': direct source check date must be within 31 days of publication: ' + source.url);
      }
    }
    if (!/(?:사례|예시|상황별|조건별|비교|결정표|선택 기준|계산)/.test(data.body || '')) {
      errors.push(relative + ': new article needs a case, concrete comparison, decision table or calculation relevant to the topic');
    }
  }

  const text = JSON.stringify(data);
  for (const phrase of banned) {
    if (text.includes(phrase)) errors.push(`${relative}: banned phrase ${phrase}`);
  }
}

if (files.length < 10) errors.push(`site: at least 10 initial articles required (found ${files.length})`);

if (errors.length) {
  console.error(`Content validation failed: ${errors.length}`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Content validation passed: ${files.length} article(s), all with 3 rich pages, HTTPS images, bounded official hosts, and official CTAs.`);
