import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('content/posts');
const files = fs.readdirSync(root, { recursive: true }).filter((file) => file.endsWith('.json'));
const slugs = new Set(); const titles = new Set(); const errors = [];
const official = ['go.kr','or.kr','gov.kr','car365.go.kr','cyberts.kr','ev.or.kr','mecar.or.kr','bizinfo.go.kr','sbiz24.kr','bokjiro.go.kr','wetax.go.kr'];
const banned = ['정부 공식 사이트입니다','100% 지급','무조건 지급','승인 보장','공식 지원센터'];
const required = ['title','description','slug','category','publishedAt','updatedAt','reviewedAt','author','keywords','keyPoints','sources','faqs','body'];
for (const rel of files) {
  const file = path.join(root, rel); let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors.push(`${rel}: invalid JSON (${error.message})`); continue; }
  for (const key of required) if (data[key] === undefined || data[key] === null || data[key] === '') errors.push(`${rel}: missing ${key}`);
  if (!data.title || data.title.length < 12) errors.push(`${rel}: title too short`);
  if (!data.description || data.description.length < 45 || data.description.length > 180) errors.push(`${rel}: description must be 45-180 chars`);
  if (!/^[a-z0-9-]+$/.test(data.slug || '')) errors.push(`${rel}: invalid slug`);
  if (!['car','support'].includes(data.category)) errors.push(`${rel}: invalid category`);
  if (slugs.has(data.slug)) errors.push(`${rel}: duplicate slug`); else slugs.add(data.slug);
  if (titles.has(data.title)) errors.push(`${rel}: duplicate title`); else titles.add(data.title);
  if ((data.body || '').length < 1500) errors.push(`${rel}: body too thin (${(data.body || '').length})`);
  if (!Array.isArray(data.keywords) || data.keywords.length < 3) errors.push(`${rel}: at least 3 keywords required`);
  if (!Array.isArray(data.keyPoints) || data.keyPoints.length < 3) errors.push(`${rel}: at least 3 key points required`);
  if (!Array.isArray(data.faqs) || data.faqs.length < 2) errors.push(`${rel}: at least 2 FAQs required`);
  if (!Array.isArray(data.sources) || data.sources.length < 1) errors.push(`${rel}: source required`);
  if (data.series !== undefined) {
    const parts = data.series?.parts;
    if (!Array.isArray(parts) || parts.length !== 3) {
      errors.push(`${rel}: series must contain exactly 3 parts`);
    } else {
      parts.forEach((part, index) => {
        const label = `series part ${index + 1}`;
        if (!part.title || part.title.length < 8) errors.push(`${rel}: ${label} title too short`);
        if (!part.description || part.description.length < 35 || part.description.length > 180) errors.push(`${rel}: ${label} description must be 35-180 chars`);
        if (!Array.isArray(part.keyPoints) || part.keyPoints.length < 3) errors.push(`${rel}: ${label} needs at least 3 key points`);
        if (!part.body || part.body.length < 600) errors.push(`${rel}: ${label} body too thin (${(part.body || '').length})`);
        if (index < 2 && (!part.nextLabel || part.nextLabel.length < 6)) errors.push(`${rel}: ${label} nextLabel required`);
      });
      const totalSeriesLength = parts.reduce((sum, part) => sum + (part.body || '').length, 0);
      if (totalSeriesLength < 1800) errors.push(`${rel}: series total body too thin (${totalSeriesLength})`);
      if (!data.officialCta?.href || !/^https:\/\//.test(data.officialCta.href)) errors.push(`${rel}: series requires an official HTTPS CTA`);
    }
  }
  const urls = (data.sources || []).map((source) => source.url).filter(Boolean);
  if (!urls.some((url) => { try { return official.some((host) => new URL(url).hostname.endsWith(host)); } catch { return false; } })) errors.push(`${rel}: official source required`);
  const text = JSON.stringify(data);
  for (const phrase of banned) if (text.includes(phrase)) errors.push(`${rel}: banned claim ${phrase}`);
}
if (files.length < 10) errors.push(`site: at least 10 initial articles required (found ${files.length})`);
if (errors.length) { console.error(`Content validation failed: ${errors.length}`); errors.forEach((error) => console.error(`- ${error}`)); process.exit(1); }
console.log(`Content validation passed: ${files.length} article(s).`);
