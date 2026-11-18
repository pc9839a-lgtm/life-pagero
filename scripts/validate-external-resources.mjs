import fs from 'node:fs';
import path from 'node:path';
import {classifyExternalResponse} from './external-resource-status.mjs';

const CONTENT_ROOT = path.resolve('content/posts');
const CONCURRENCY = Number(process.env.EXTERNAL_CHECK_CONCURRENCY || 6);
const TIMEOUT_MS = Number(process.env.EXTERNAL_CHECK_TIMEOUT_MS || 12000);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const records = new Map();

function add(url, type, owner) {
  if (!url) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${owner}: invalid external URL ${url}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`${owner}: external URL must use HTTPS: ${url}`);
  }
  const key = parsed.href;
  const existing = records.get(key) || { url: key, types: new Set(), owners: new Set() };
  existing.types.add(type);
  existing.owners.add(owner);
  records.set(key, existing);
}

for (const file of walk(CONTENT_ROOT).filter((item) => item.endsWith('.json'))) {
  const post = JSON.parse(fs.readFileSync(file, 'utf8'));
  const owner = `${post.category}/${post.slug}`;

  for (const source of post.sources || []) add(source.url, 'source', owner);
  add(post.officialCta?.href, 'official-cta', owner);
  for (const part of post.series?.parts || []) add(part.image, 'image', owner);
}

// Food-guide citations and photo licensing must be checked too. Previously
// validate:external only inspected content/posts, silently skipping /food/.
const foodGuides = JSON.parse(fs.readFileSync('content/food-guides.json','utf8'));
for (const guide of foodGuides.guides) {
  const owner = 'food/' + guide.slug;
  for (const [,url] of guide.sources) add(url, 'source', owner);
  for (const photo of guide.visuals) add(photo.source, 'image-credit', owner);
}

async function request(record) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(record.url, {
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; life-pagero-link-validator/1.0)',
        accept: record.types.has('image')
          ? 'image/avif,image/webp,image/*,*/*;q=0.8'
          : 'text/html,application/xhtml+xml,application/json,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (response.body) await response.body.cancel().catch(() => {});
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function inspect(record) {
  // Original editorial SVGs are served by the canonical /life/ proxy.
  // Verify the checked-in asset instead of requesting an as-yet unpublished URL.
  const localImageUrl = new URL(record.url);
  const localAssetMatch = /^\/life\/images\/((?:editorial\/)?[a-z0-9-]+\.svg)$/.exec(localImageUrl.pathname);
  if (record.types.has('image') && localImageUrl.origin === 'https://pagero.kr' && localAssetMatch) {
    const name = localAssetMatch[1];
    const file = path.resolve('public/images', name);
    if (!fs.existsSync(file)) return { level: 'error', message: 'missing first-party SVG file: ' + name };
    const svg = fs.readFileSync(file, 'utf8');
    if (!svg.includes('<svg ') || !svg.includes('viewBox=') || svg.length < 800) {
      return { level: 'error', message: 'incomplete original SVG asset: ' + name };
    }
    return { level: 'ok', message: 'first-party editorial SVG validated locally' };
  }
  let response;
  let networkError;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      // Verify the page a reader opens, not just a HEAD response. Some
      // protected portals return HEAD 200 while GET is blocked/redirected.
      response = await request(record);
      networkError = null;
      break;
    } catch (error) {
      networkError = error;
      response = undefined;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!response) {
    return {
      level: 'warning',
      cause: 'network-unverifiable',
      message: `network check unavailable (${networkError?.name || 'Error'}: ${networkError?.message || 'unknown error'})`,
      httpStatus: null, finalUrl: null,
    };
  }

  const classification = classifyExternalResponse({
    requestedUrl: record.url,
    responseUrl: response.url,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    isImage: record.types.has('image'),
  });
  return {...classification, httpStatus: response.status, finalUrl: response.url};
}

const queue = [...records.values()];
const results = [];
let cursor = 0;

async function worker() {
  while (cursor < queue.length) {
    const index = cursor;
    cursor += 1;
    const record = queue[index];
    const result = await inspect(record);
    results[index] = { record, result };
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, () => worker()));

const errors = [];
const warnings = [];
const warningsByCause = {
  'network-unverifiable': 0,
  'access-restricted': 0,
  'security-interstitial': 0,
  'homepage-redirect': 0,
  'insecure-redirect': 0,
  'temporary-server-response': 0,
  'unexpected-http-response': 0,
  'image-content-type': 0,
  'other': 0,
};
const warningDetails = [];
const hardFailures = [];
const warningsByPage = new Map();


for (const { record, result } of results) {
  const owners = [...record.owners].join(', ');
  const types = [...record.types].join(', ');
  const line = `${result.message} | ${types} | ${record.url} | ${owners}`;
  if (result.level === 'error') {
    errors.push(line);
    hardFailures.push({url:record.url, types:[...record.types], owners:[...record.owners],
      message:result.message, httpStatus:result.httpStatus ?? null, finalUrl:result.finalUrl ?? null});
  } else if (result.level === 'warning') {
    warnings.push(line);
    const cause=result.cause || 'other';
    warningsByCause[cause]=(warningsByCause[cause]||0)+1;
    const detail={url:record.url, types:[...record.types], owners:[...record.owners],
      cause, message:result.message, httpStatus:result.httpStatus ?? null,
      finalUrl:result.finalUrl ?? null};
    warningDetails.push(detail);
    for(const owner of record.owners){
      if(!warningsByPage.has(owner))warningsByPage.set(owner,[]);
      warningsByPage.get(owner).push({url:record.url,cause,message:result.message});
    }
  }
}

// A failed connection or anti-bot response does NOT prove that an editorial
// source is dead. Keep all warnings visible and write machine-readable evidence
// for targeted manual verification, without silently recategorizing them as OK.
const report={
  checkedAt: new Date().toISOString(),
  requestMethod: 'GET',
  uniqueUrlsChecked:queue.length,
  hardFailureCount:hardFailures.length,
  warningCount:warningDetails.length,
  warningCategories:warningsByCause,
  hardFailures,
  warnings:warningDetails,
  affectedPublishedPages:[...warningsByPage.entries()]
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([page,items])=>({page,warningCount:items.length,warnings:items})),
};
fs.writeFileSync('external-validation-report.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log('External resource report written: external-validation-report.json');
console.log('External warning categories: '+JSON.stringify(warningsByCause));
if (process.env.GITHUB_STEP_SUMMARY) {
  const groups=Object.entries(warningsByCause).filter(([,count])=>count>0)
    .sort((a,b)=>b[1]-a[1]);
  const pages=report.affectedPublishedPages
    .sort((a,b)=>b.warningCount-a.warningCount||a.page.localeCompare(b.page));
  const lines=[
    '## LIFE official outbound references — HTTP GET audit',
    '',
    'Checked '+queue.length+' unique references. Verified 404/410: '+hardFailures.length+
      '. Unverified / restricted: '+warningDetails.length+'.',
    '',
    '| Cause | URLs |',
    '|---|---:|',
    ...groups.map(([cause,count])=>'| '+cause+' | '+count+' |'),
    '',
    '### Pages requiring source verification',
    '',
    '| Page | Unverified references |',
    '|---|---:|',
    ...pages.slice(0,30).map(x=>'| '+x.page+' | '+x.warningCount+' |'),
    '',
    'A bot-blocked, HTTP 417/403, timed-out or security-redirected URL is **unverified**, not confirmed dead.',
    'Full URL, HTTP status and final redirect URL: external-validation-report.json (workflow artifact).'
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\\n')+'\\n');
}


if (warnings.length) {
  console.warn(`External resource warnings: ${warnings.length}`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length) {
  console.error(`External resource validation failed: ${errors.length}`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`External resources checked: ${queue.length} unique URL(s), ${warnings.length} warning(s), no hard 404/410 failures.`);
