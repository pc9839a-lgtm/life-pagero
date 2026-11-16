// Pure Korean-language on-site search. No network, account data or analytics.
export function normalizeQuery(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
const compact = value => normalizeQuery(value).replace(/\s+/g, '');
export function searchGuides(index, query, limit = 20) {
  const cleaned = normalizeQuery(query);
  if (!cleaned || !Array.isArray(index) || limit <= 0) return [];
  const tokens = cleaned.split(' ');
  const term = compact(cleaned);
  const scored = [];
  const seen = new Set();
  for (const record of index) {
    if (!record || typeof record.url !== 'string' ||
      !/^\/(?:[a-z0-9-]+\/)*$/.test(record.url) || seen.has(record.url)) continue;
    seen.add(record.url);
    const title = normalizeQuery(record.title);
    const description = normalizeQuery(record.description);
    const keywords = normalizeQuery(Array.isArray(record.keywords) ? record.keywords.join(' ') : '');
    const fields = [title, keywords, description];
    const together = fields.join(' ');
    const combined = compact(together);
    const exactPhrase = fields.some(field=>compact(field).includes(term));
    if (!exactPhrase && !tokens.every(token=>together.includes(token) || combined.includes(compact(token))))
      continue;
    let score = 0;
    if (compact(title) === term) score += 250;
    else if (compact(title).includes(term)) score += 150;
    if (compact(keywords).includes(term)) score += 105;
    if (compact(description).includes(term)) score += 45;
    for (const token of tokens) {
      if (title.includes(token) || compact(title).includes(compact(token))) score += 17;
      if (keywords.includes(token) || compact(keywords).includes(compact(token))) score += 7;
      if (description.includes(token) || compact(description).includes(compact(token))) score += 3;
    }
    scored.push({ record, score });
  }
  scored.sort((a, b) => b.score - a.score ||
    String(a.record.title).localeCompare(String(b.record.title), 'ko') ||
    a.record.url.localeCompare(b.record.url, 'en'));
  return scored.slice(0, Math.min(limit, 50)).map(item=>item.record);
}

// Search results are stored as site-root paths, but the canonical LIFE site
// lives beneath /life/ on pagero.kr. Derive the public prefix from the actual
// loaded search module, not location.origin or a hardcoded root path.
export function searchResultHref(pathname, moduleUrl) {
  if (typeof pathname !== 'string' || !/^\/(?:[a-z0-9-]+\/)*$/.test(pathname))
    throw new Error('[search] Invalid indexed destination');
  const module = new URL(moduleUrl);
  if (!['http:', 'https:'].includes(module.protocol))
    throw new Error('[search] Unsupported script origin');
  return new URL('.' + pathname, module).href;
}
