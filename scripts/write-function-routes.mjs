import fs from 'node:fs';
import path from 'node:path';

// The root wildcard Function is required to redirect life.pagero.kr HTML
// to pagero.kr/life. Do not bill Functions for static CSS/JS/images/fonts
// requested by every visitor. Cloudflare Pages matches path patterns and
// excludes always win; specific /today/api, /finance/api and /deals/api
// must continue to invoke Functions (they have no file extensions).
const routes={
  version:1,
  include:['/*'],
  exclude:[
    '/*.js','/*.css','/*.svg','/*.png','/*.jpg','/*.jpeg','/*.webp',
    '/*.avif','/*.gif','/*.ico','/*.woff','/*.woff2','/*.ttf','/*.otf',
    '/*.map','/*.json','/*.xml','/*.txt','/*.webmanifest',
    '/images/*','/food-images/*','/assets/*','/.well-known/*'
  ]
};
const out=path.resolve('dist/_routes.json');
fs.writeFileSync(out,JSON.stringify(routes,null,2)+'\n');
console.log('[function-routes] Static assets bypass Pages Functions; dynamic APIs and HTML redirect routes remain active.');
