import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const bundleDir = path.resolve('automation/content-bundle');
const payload = fs.readdirSync(bundleDir)
  .filter((name) => name.endsWith('.txt'))
  .sort()
  .map((name) => fs.readFileSync(path.join(bundleDir, name), 'utf8').trim())
  .join('');

const decoded = zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
const files = JSON.parse(decoded);

for (const [relativePath, content] of Object.entries(files)) {
  const target = path.resolve(relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

console.log(`Applied ${Object.keys(files).length} current content update(s).`);
