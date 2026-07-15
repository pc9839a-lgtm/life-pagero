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

console.log(CHECK_ONLY
  ? `Validated ${validated} bundled content update(s) without writing files.`
  : `Applied ${applied} validated content update(s).`);
