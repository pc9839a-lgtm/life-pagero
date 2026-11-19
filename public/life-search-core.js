// Pure Korean-language on-site search. No network, account data or analytics.
export function normalizeQuery(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
const compact = value => normalizeQuery(value).replace(/\s+/g, '');
function searchGuidesDirect(index, query, limit = 20) {
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

// Keep only deliberate colloquial task synonyms; do not broaden a query into
// unrelated government policies or invent nonexistent pages. Exact matches win.
const QUERY_SYNONYMS = new Map([
  ['부가세', ['부가가치세']],
  ['종소세', ['종합소득세']],
  ['주담대', ['주택담보대출']],
  ['전세계약연장', ['계약갱신']],
  ['전세연장', ['계약갱신']],
  ['월세계약연장', ['계약갱신']],
  ['미지급임금', ['임금체불']],
  ['못받은월급', ['임금체불']],
  ['핸드폰환급', ['통신미환급액']],
  ['휴대폰환급', ['통신미환급액']],
  ['국가검진', ['건강검진']],
  ['건강보험검진', ['건강검진']],
  ['주민증재발급', ['주민등록증재발급']],
  ['가족증명서', ['가족관계증명서']],
]);
export function searchGuides(index,query,limit=20){
  if(!Number.isFinite(limit)||limit<=0)return [];
  const max=Math.min(Math.floor(limit),50);
  const first=searchGuidesDirect(index,query,50);
  const terms=QUERY_SYNONYMS.get(normalizeQuery(query).replace(/\s+/g,''))||[];
  const seen=new Set(first.map(item=>item.url));
  for(const term of terms){
    for(const result of searchGuidesDirect(index,term,50)){
      if(!seen.has(result.url)){seen.add(result.url);first.push(result);}
    }
  }
  return first.slice(0,max);
}

// The canonical Pagero proxy rewrites *JSON* root paths (/car/foo/) to
// /life/car/foo/, whereas the raw Pages origin keeps /car/foo/. Use the loaded
// module's directory as the site prefix and accept either representation once.
export function searchResultHref(pathname, moduleUrl) {
  if (typeof pathname !== 'string' || !/^\/(?:[a-z0-9-]+\/)*$/.test(pathname))
    throw new Error('[search] Invalid indexed destination');
  const module = new URL(moduleUrl);
  if (!['http:', 'https:'].includes(module.protocol))
    throw new Error('[search] Unsupported script origin');
  const site = new URL('.', module);
  const prefix = site.pathname; // /life/ in Pagero; / at standalone origin
  const destination = prefix !== '/' && pathname.startsWith(prefix)
    ? pathname : prefix + pathname.slice(1);
  if (prefix !== '/' && destination.startsWith(prefix + prefix.slice(1)))
    throw new Error('[search] Duplicate site prefix in indexed destination');
  return new URL(destination, site.origin).href;
}
