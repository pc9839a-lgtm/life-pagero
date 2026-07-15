import fs from 'node:fs';
import path from 'node:path';

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

async function request(record, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(record.url, {
      method,
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
  let response;
  let networkError;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      try {
        response = await request(record, 'HEAD');
      } catch (headError) {
        networkError = headError;
        response = await request(record, 'GET');
      }

      if (response.status >= 400) {
        response = await request(record, 'GET');
      }

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
      message: `network check unavailable (${networkError?.name || 'Error'}: ${networkError?.message || 'unknown error'})`,
    };
  }

  const status = response.status;
  if ([404, 410].includes(status)) return { level: 'error', message: `hard failure HTTP ${status}` };
  if (status >= 500) return { level: 'warning', message: `temporary server response HTTP ${status}` };
  if ([401, 403, 405, 429].includes(status)) return { level: 'ok', message: `reachable but restricted HTTP ${status}` };
  if (status < 200 || status >= 400) return { level: 'warning', message: `unexpected HTTP ${status}` };

  const contentType = response.headers.get('content-type') || '';
  if (record.types.has('image') && contentType && !contentType.startsWith('image/')) {
    return { level: 'warning', message: `image URL returned ${contentType}` };
  }

  return { level: 'ok', message: `HTTP ${status}` };
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

for (const { record, result } of results) {
  const owners = [...record.owners].join(', ');
  const types = [...record.types].join(', ');
  const line = `${result.message} | ${types} | ${record.url} | ${owners}`;
  if (result.level === 'error') errors.push(line);
  else if (result.level === 'warning') warnings.push(line);
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
