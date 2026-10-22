import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes('--check');
const bundleDirs = [
  path.join(ROOT, 'automation', 'content-bundle'),
  path.join(ROOT, 'automation', 'inspection-bundle'),
];
const allowedRoots = [
  path.join(ROOT, 'content'),
  path.join(ROOT, 'automation'),
  path.join(ROOT, 'public'),
];
const overrideFile = path.join(ROOT, 'automation', 'url-overrides.json');

// Keep newer fact-checked edits made directly to these published posts from
// being replaced by an older compressed content/inspection bundle on deploy.
// Future bundles with a strictly newer updatedAt still take precedence.
const PROTECTED_EDITORIAL_POSTS = new Set([
  'content/posts/car/car-inspection-period.json',
  'content/posts/car/car-registration-certificate-reissue.json',
  'content/posts/support/basic-pension-2026.json',
  'content/posts/support/child-allowance-2026.json',
]);


const isInside = (candidate, parent) => candidate === parent || candidate.startsWith(`${parent}${path.sep}`);

function resolveSafeTarget(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    throw new Error('Bundle contains an empty or non-string path');
  }
  if (relativePath.includes('\0') || path.isAbsolute(relativePath)) {
    throw new Error(`Bundle path must be relative: ${relativePath}`);
  }

  const target = path.resolve(ROOT, relativePath);
  if (!allowedRoots.some((allowedRoot) => isInside(target, allowedRoot))) {
    throw new Error(`Bundle path is outside allowed roots: ${relativePath}`);
  }
  if (bundleDirs.some((bundleDir) => isInside(target, bundleDir))) {
    throw new Error(`Bundle may not overwrite its own payload: ${relativePath}`);
  }
  return target;
}

function readOverrides() {
  if (!fs.existsSync(overrideFile)) return {};
  let overrides;
  try {
    overrides = JSON.parse(fs.readFileSync(overrideFile, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid URL override file: ${error.message}`);
  }
  if (!overrides || Array.isArray(overrides) || typeof overrides !== 'object') {
    throw new Error('URL overrides must be an object mapping retired URLs to replacements');
  }
  for (const [from, to] of Object.entries(overrides)) {
    if (typeof from !== 'string' || typeof to !== 'string' || !from.startsWith('https://') || !to.startsWith('https://')) {
      throw new Error(`URL override must map HTTPS strings: ${from}`);
    }
    if (from === to) throw new Error(`URL override source and target are identical: ${from}`);
  }
  return overrides;
}

let validated = 0;
let applied = 0;
const seenTargets = new Set();

for (const bundleDir of bundleDirs) {
  if (!fs.existsSync(bundleDir)) continue;

  const payload = fs.readdirSync(bundleDir)
    .filter((name) => name.endsWith('.txt'))
    .sort()
    .map((name) => fs.readFileSync(path.join(bundleDir, name), 'utf8').trim())
    .join('');

  if (!payload) continue;

  let files;
  try {
    const decoded = zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
    files = JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Invalid content bundle in ${path.relative(ROOT, bundleDir)}: ${error.message}`);
  }

  if (!files || Array.isArray(files) || typeof files !== 'object') {
    throw new Error(`Bundle payload must be a path-to-content object: ${path.relative(ROOT, bundleDir)}`);
  }

  for (const [relativePath, content] of Object.entries(files)) {
    if (typeof content !== 'string') throw new Error(`Bundle content must be UTF-8 text: ${relativePath}`);
    const target = resolveSafeTarget(relativePath);
    if (seenTargets.has(target)) throw new Error(`Duplicate bundle target: ${relativePath}`);
    seenTargets.add(target);
    validated += 1;

    if (!CHECK_ONLY) {
      const normalized = relativePath.split(path.sep).join('/');
      if (PROTECTED_EDITORIAL_POSTS.has(normalized) && fs.existsSync(target)) {
        const current = JSON.parse(fs.readFileSync(target, 'utf8'));
        const incoming = JSON.parse(content);
        const currentDate = Date.parse(current.updatedAt || '');
        const incomingDate = Date.parse(incoming.updatedAt || '');
        if (Number.isFinite(currentDate) && Number.isFinite(incomingDate) && currentDate >= incomingDate) {
          console.log('Preserved newer reviewed post:', normalized, current.updatedAt, '(bundle:', incoming.updatedAt + ')');
          continue;
        }
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
      applied += 1;
    }
  }
}

// Editorial additions are applied AFTER compressed bundles so reviewed
// analysis, direct sources and user decision tables cannot silently disappear.
// Patches are append-only to matching series sections and never change unrelated posts.
const editorialRoot = path.join(ROOT, 'automation', 'editorial-patches');
let editorialPatchesApplied = 0;
if (!CHECK_ONLY && fs.existsSync(editorialRoot)) {
  for (const file of fs.readdirSync(editorialRoot).filter(name => name.endsWith('.json')).sort()) {
    const patch = JSON.parse(fs.readFileSync(path.join(editorialRoot, file), 'utf8'));
    const target = resolveSafeTarget(patch.target);
    if (!target.startsWith(path.join(ROOT, 'content', 'posts') + path.sep)) {
      throw new Error('Editorial patch may modify content/posts only: ' + file);
    }
    if (!fs.existsSync(target)) throw new Error('Editorial patch target not found: ' + patch.target);
    const article = JSON.parse(fs.readFileSync(target, 'utf8'));
    // Content bundles may reuse a historical JSON filename for a NEW public article.
    // Never merge a reviewed patch into a different category/slug after bundle hydration.
    const pieces = patch.target.replace(/\\/g, '/').split('/');
    const expectedCategory = pieces[2];
    const expectedSlug = pieces[3]?.replace(/\.json$/, '');
    if (article.category !== expectedCategory || article.slug !== expectedSlug) {
      throw new Error(
        'Editorial target has been repurposed by content bundle: ' + patch.target
        + ' => ' + article.category + '/' + article.slug
        + ' (expected ' + expectedCategory + '/' + expectedSlug + ')'
      );
    }

    // Standalone posts have no series.parts. Preserve their reviewed edits in
    // the canonical article body; for serialized posts, preserve each part too.
    const parts = Array.isArray(article.series?.parts) ? article.series.parts : null;
    for (const piece of patch.sections || []) {
      if (!piece.text || typeof piece.text !== 'string'
          || !Number.isInteger(piece.partIndex) || piece.partIndex < 0) {
        throw new Error('Editorial patch section invalid: ' + file);
      }
      const part = parts ? parts[piece.partIndex] : null;
      if (parts && !part) {
        throw new Error('Editorial patch refers to missing series part: ' + file);
      }
      const heading = piece.text.split('\n')[0].trim();
      if (part && !part.body.includes(heading)) {
        part.body = part.body.trimEnd() + '\n\n' + piece.text.trim() + '\n';
      }
      if (!article.body?.includes(heading)) {
        article.body = String(article.body || '').trimEnd() + '\n\n' + piece.text.trim() + '\n';
      }
    }
    const sources = Array.isArray(article.sources) ? article.sources : [];
    const additions = Array.isArray(patch.sources) ? patch.sources : [];
    article.sources = [...additions, ...sources].filter((source,index,array) =>
      array.findIndex(item => item.url === source.url) === index);
    const incomingDate = Date.parse(patch.updatedAt || '');
    const currentDate = Date.parse(article.updatedAt || '');
    if (!Number.isFinite(incomingDate)) throw new Error('Invalid editorial updatedAt: ' + file);
    if (!Number.isFinite(currentDate) || incomingDate >= currentDate) {
      article.updatedAt = patch.updatedAt;
      article.reviewedAt = patch.reviewedAt || article.reviewedAt;
    }
    fs.writeFileSync(target, JSON.stringify(article,null,2) + '\n', 'utf8');
    editorialPatchesApplied += 1;
    console.log('Preserved verified editorial sections:', patch.target, 'sections:', (patch.sections || []).length);
  }
}

const overrides = readOverrides();
let replacements = 0;
if (!CHECK_ONLY && Object.keys(overrides).length) {
  const contentRoot = path.join(ROOT, 'content', 'posts');
  const contentFiles = fs.readdirSync(contentRoot, { recursive: true })
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(contentRoot, name));

  for (const file of contentFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    for (const [from, to] of Object.entries(overrides)) {
      const occurrences = content.split(from).length - 1;
      if (occurrences > 0) {
        content = content.split(from).join(to);
        replacements += occurrences;
      }
    }
    if (content !== original) fs.writeFileSync(file, content, 'utf8');
  }
}

console.log(CHECK_ONLY
  ? `Validated ${validated} bundled content update(s) and ${Object.keys(overrides).length} URL override(s) without writing files.`
  : `Applied ${applied} validated content update(s) and ${replacements} retired URL replacement(s).`);
