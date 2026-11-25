import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('dist');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const page=read('support/disabled-child-allowance-2026/index.html');
const js=read('disability-child-allowance-tool.js');
const css=read('life-editorial-20261106.css');
const shortHash=createHash('sha256').update(js).digest('hex').slice(0,12);

for(const marker of [
 'id="life-disabled-child-benefit-tool"','id="benefit-grade"','id="benefit-group"',
 'id="benefit-place"','id="benefit-monthly"','id="benefit-annual"',
 'id="benefit-explanation"','2026 장애아동수당 금액 비교',
 'https://www.mohw.go.kr/menu.es?mid=a10710030200',
 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003198',
 '<script type="module" src="/disability-child-allowance-tool.js?v='+shortHash+'"></script>'
])assert(page.includes(marker),'comparison tool UI or verified evidence missing: '+marker);

assert.equal((page.match(/id="life-disabled-child-benefit-tool"/g)||[]).length,1,'duplicate tool');
assert(page.includes('class="article-content"') && page.includes('class="source-box"'),
 'original article and official citations must survive');
assert(page.includes('aria-live="polite"'),'results are not accessible');
assert(!page.includes('life-coupang-placement')&&!page.includes('ads-partners.coupang.com'),
 'content-first ad-free guarantee changed on original article');
assert((page.match(/<link rel="canonical"/g)||[]).length===1,'canonical duplicated');
assert(page.includes('<link rel="canonical" href="https://pagero.kr/life/support/disabled-child-allowance-2026/">'),
 'canonical changed');
assert(/<meta name="robots" content="index,follow/.test(page),'original guide unexpectedly noindex');
assert(page.includes('google-adsense-account'),'publisher verification metadata missing');
assert(js.includes('new Intl.NumberFormat(') && !/fetch\(|localStorage|sessionStorage|document\.cookie|navigator\.sendBeacon/.test(js),
 'tool must not require network or collect/store visitor data');
for(const selector of ['.benefit-compare-fields','.benefit-compare-result','@media(max-width:700px)']){
 assert(css.includes(selector),'responsive tool style missing: '+selector);
}
for(const no of [2,3]){
 const follow=read('support/disabled-child-allowance-2026/'+no+'/index.html');
 assert(!follow.includes('id="life-disabled-child-benefit-tool"'),'duplicate utility on thin continuation');
 assert(/content="noindex,follow/.test(follow),'existing noindex rule changed');
}
const sitemap=read('sitemap.xml');
assert(sitemap.includes('<loc>https://pagero.kr/life/support/disabled-child-allowance-2026/</loc>'),
 'original indexed guide disappeared');
assert(!sitemap.includes('disabled-child-allowance-tool/'),'created an unnecessary standalone URL');
console.log('[benefit-tool-qa] PASS original self-service rate calculator, all six official combinations, two invalid class families, 2026 source citation, one canonical, ad-free guide and unchanged 2 noindex follow-ups.');
