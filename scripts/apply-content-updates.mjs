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
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
      applied += 1;
    }
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
