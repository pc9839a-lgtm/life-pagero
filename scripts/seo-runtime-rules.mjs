// Check the rules that Googlebot reads at the canonical HOST root.
// /life/robots.txt is not the effective robots policy for /life/* pages.
export const SITE = 'https://pagero.kr/life';
export const EXPECTED_SITEMAP = SITE + '/sitemap.xml';

export function robotsAllows(text, pathname = '/life/', agent = 'Googlebot') {
  const groups = [];
  let current = { agents: [], rules: [] };
  function flush() {
    if (current.agents.length) groups.push(current);
    current = { agents: [], rules: [] };
  }
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const directive = m[1].toLowerCase();
    const value = m[2].trim();
    if (directive === 'user-agent') {
      if (current.rules.length) flush();
      current.agents.push(value.toLowerCase());
    } else if ((directive === 'allow' || directive === 'disallow') && current.agents.length) {
      current.rules.push({ allow: directive === 'allow', pattern: value });
    }
  }
  flush();
  const userAgent = String(agent).toLowerCase();
  const ranked = groups.map(group => {
    const score = Math.max(...group.agents.map(value =>
      value === '*' ? 1 : userAgent.includes(value) ? value.length + 1 : 0
    ));
    return { group, score };
  }).filter(item => item.score > 0);
  const bestAgentScore = Math.max(0, ...ranked.map(item => item.score));
  const candidates = ranked.filter(item => item.score === bestAgentScore)
    .flatMap(item => item.group.rules);
  const matching = candidates.flatMap(rule => {
    if (!rule.pattern) return [];
    const raw = rule.pattern;
    const end = raw.endsWith('$');
    const stripped = end ? raw.slice(0,-1) : raw;
    const regex = new RegExp('^' + stripped.split('*')
      .map(part=>part.replace(/([()[\]{}.+?^$|\\])/g,'\\$1')).join('.*') + (end?'$':''));
    if (!regex.test(pathname)) return [];
    return [{ allow:rule.allow, specificity:stripped.replace(/\*/g,'').length }];
  }).sort((a,b)=>b.specificity-a.specificity || Number(b.allow)-Number(a.allow));
  return matching.length ? matching[0].allow : true;
}

export function checkRootRobots(text, paths = [
  '/life/', '/life/car/car-inspection-period/', '/life/support/child-allowance-2026/'
]) {
  const sitemap = String(text).split(/\r?\n/)
    .map(line=>line.trim())
    .filter(line=>/^Sitemap:\s*/i.test(line))
    .map(line=>line.replace(/^Sitemap:\s*/i,''));
  if (!sitemap.includes(EXPECTED_SITEMAP)) throw Error('Canonical /life/sitemap.xml absent from HOST ROOT robots.txt');
  // The entire public sitemap must be permitted to both major Korean
  // search crawlers. Checking only three sample URLs misses path-specific
  // Disallow directives (for example /life/food/ or /life/finance/).
  for (const target of paths) {
    const pathname = String(target).startsWith('https://') ? new URL(target).pathname : target;
    if (typeof pathname !== 'string' || !pathname.startsWith('/life/'))
      throw Error('Unexpected non-LIFE URL in robots coverage: ' + String(target));
    for (const crawler of ['Googlebot', 'Yeti']) {
      if (!robotsAllows(text,pathname,crawler))
        throw Error('Host-root ' + crawler + ' robots disallows ' + pathname);
    }
  }
  return paths.length;
}

export function robotsMeta(html) {
  return String(html).match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0] || '';
}
export function canonicalHref(html) {
  return String(html).match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] || '';
}
export function ensureIndexable({status,headers,content},url) {
  if (status!==200) throw Error('Expected 200, received HTTP '+status);
  if (/\bnoindex\b/i.test(headers.get('X-Robots-Tag')||''))
    throw Error('Canonical public response has X-Robots-Tag: noindex');
  if (headers.get('X-Pagero-Life-Proxy')!=='1')
    throw Error('Canonical public URL bypassed the production LIFE proxy');
  const robots=robotsMeta(content);
  if (!robots || /\bnoindex\b/i.test(robots)) throw Error('Missing or noindex HTML robots tag');
  if (canonicalHref(content)!==url) throw Error('Canonical mismatch: '+canonicalHref(content));
  const titles = [...content.matchAll(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/gi)];
  if (titles.length !== 1 || !titles[0][1].replace(/<[^>]+>/g,'').trim())
    throw Error('Missing, empty or duplicated HTML title');
  const descriptions = [...content.matchAll(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/gi)];
  if (descriptions.length !== 1 ||
      !/\bcontent\s*=\s*["'][^"']{20,}["']/i.test(descriptions[0][0]))
    throw Error('Missing, empty, short or duplicated HTML meta description');
  if ((content.match(/<h1(?:\s[^>]*)?>/gi)||[]).length!==1)
    throw Error('Expected exactly one H1');
}
export function ensureContinuationNoindex({status,headers,content},url) {
  if (status!==200) throw Error('Continuation HTTP '+status);
  if (!/\bnoindex\b/i.test(robotsMeta(content)))
    throw Error('Continuation page lost HTML noindex');
  if (canonicalHref(content)!==url)
    throw Error('Continuation canonical mismatch: '+canonicalHref(content));
  if ((content.match(/<h1(?:\s[^>]*)?>/gi)||[]).length!==1)
    throw Error('Continuation page missing a single H1');
}
export function ensurePreviewIsNotIndexable({status,headers,content},url,canonicalUrl) {
  const location=headers.get('location');
  if ([301,308].includes(status) && location && new URL(location,url).href===canonicalUrl) return;
  if (status!==200) throw Error('Preview response '+status+' (no canonical redirect)');
  if (!/\bnoindex\b/i.test(headers.get('X-Robots-Tag')||'')
      && !/\bnoindex\b/i.test(robotsMeta(content)))
    throw Error('Duplicate preview hostname is indexable');
}
export function ensureDeploymentManifest({status,content},expectedSha='') {
  if (status!==200) throw Error('Deployment provenance endpoint returned HTTP '+status);
  let manifest;
  try { manifest=JSON.parse(content); }
  catch { throw Error('Invalid deployment JSON'); }
  if (manifest.repository!=='pc9839a-lgtm/life-pagero')
    throw Error('Unexpected deployment repository');
  if (!/^[0-9a-f]{40}$/i.test(manifest.commit||''))
    throw Error('Live build lacks an actual Git commit identifier');
  if (manifest.branch!=='main') throw Error('Published LIFE build is not main branch');
  if (manifest.environment!=='cloudflare-pages')
    throw Error('Production build provenance is not Cloudflare Pages');
  if (expectedSha && manifest.commit.toLowerCase()!==expectedSha.toLowerCase())
    throw Error('Live deployment is stale: expected '+expectedSha+' got '+manifest.commit);
  return manifest;
}
