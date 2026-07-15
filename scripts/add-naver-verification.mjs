import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const TOKEN = 'ff4dff731124d8d24d8b170e68c3170959eaa553';
const META = `<meta name="naver-site-verification" content="${TOKEN}">`;
const META_PATTERN = /<meta\s+name=["']naver-site-verification["'][^>]*>/gi;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(DIST)) throw new Error('dist directory is missing');

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));
if (!htmlFiles.length) throw new Error('No generated HTML files found');

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(META_PATTERN, '');
  if (!html.includes('</head>')) throw new Error(`Missing </head>: ${path.relative(DIST, file)}`);
  html = html.replace('</head>', `${META}</head>`);
  fs.writeFileSync(file, html, 'utf8');
}

const rootFile = path.join(DIST, 'index.html');
if (!fs.existsSync(rootFile)) throw new Error('Root index.html is missing');
const rootHtml = fs.readFileSync(rootFile, 'utf8');
const rootMatches = rootHtml.match(META_PATTERN) || [];
if (rootMatches.length !== 1 || !rootHtml.includes(META)) {
  throw new Error(`Root Naver verification meta is invalid: found ${rootMatches.length}`);
}

console.log(`Added Naver site verification to ${htmlFiles.length} HTML file(s).`);
