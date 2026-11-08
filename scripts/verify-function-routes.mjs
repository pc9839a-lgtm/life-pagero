import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const routes=JSON.parse(fs.readFileSync(path.resolve('dist/_routes.json'),'utf8'));
assert.equal(routes.version,1);
assert.ok(routes.include.length>0);
assert.ok(routes.include.length+routes.exclude.length<=100);
assert.ok(routes.include.every(x=>x.length<=100));
assert.ok(routes.exclude.every(x=>x.length<=100));
const matches=(pattern,url)=>{
  const source='^'+pattern.split('*').map(part=>part.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$';
  return new RegExp(source).test(url);
};
const invokes=p=>routes.include.some(rule=>matches(rule,p))&&
  !routes.exclude.some(rule=>matches(rule,p));
for(const p of [
  '/today/api/weather','/today/api/fx','/today/api/news',
  '/today/api/stocks','/today/api/crypto',
  '/finance/api/products','/finance/api/issues','/deals/api',
  '/today/','/finance/','/finance/savings/','/food/','/car/car-inspection-period/'
]){
  assert.ok(invokes(p),'critical API/HTML route accidentally excluded '+p);
}
for(const p of [
  '/food-guide-products.js','/today-dashboard.js','/life-editorial-20261106.css',
  '/food-images/oyster-clean-cook-storage-hero.jpg',
  '/images/sample.svg','/nested/images/photo.webp','/fonts/pretendard.woff2',
  '/robots.txt','/sitemap.xml','/search-index.json','/ads.txt',
  '/og-image.jpg','/favicon.ico','/.well-known/security.txt'
]){
  assert.ok(!invokes(p),'static asset must bypass Pages Functions '+p);
}
assert.equal(routes.exclude.some(x=>x==='/today/*'||x==='/finance/*'),false,
  'never block API paths in entire dynamic prefixes');
console.log('[function-routes] PASS: static assets not billed as Functions; API endpoints and legacy redirect HTML retained.');
