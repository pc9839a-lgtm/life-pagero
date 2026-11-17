import fs from 'node:fs';
import path from 'node:path';
import {
  SITE, EXPECTED_SITEMAP, checkRootRobots,
  ensureIndexable, ensureContinuationNoindex,
  ensurePreviewIsNotIndexable, ensureDeploymentManifest, robotsMeta
} from './seo-runtime-rules.mjs';
import {searchResultHref} from '../public/life-search-core.js';

// Test real HTTP responses. The parent domain root /robots.txt controls /life/*.
const PUBLIC=SITE;
const ROOT='https://pagero.kr';
const LEGACY='https://life.pagero.kr';
const ORIGIN='https://life-pagero.pages.dev';
const errors=[];
const checked=[];
const warnings=[];
const expectedCommit=['schedule','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME||'')
  ? (process.env.GITHUB_SHA||'').trim() : '';
let deployedCommit=null;
function assert(condition,message){if(!condition)throw Error(message);}
function fail(url,reason){errors.push({url,reason});}
let transientRetries=0;
async function get(url){
  // Only retry transport errors (DNS, connection reset, timeout) for a safe
  // GET. Real HTTP statuses, robots blocks and SEO metadata failures still
  // fail without being concealed by a retry.
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(url,{
        redirect:'manual',
        signal:AbortSignal.timeout(15000),
        headers:{
          accept:'text/html,application/xml,application/json,text/plain;q=0.9,*/*;q=0.5',
          'user-agent':'LifePageroSeoQA/2.0 (+https://pagero.kr/life/)'
        }
      });
      const content=await response.text();
      return {status:response.status,headers:response.headers,content};
    }catch(error){
      if(attempt===1)throw error;
      transientRetries++;
      await new Promise(resolve=>setTimeout(resolve,350));
    }
  }
}
async function check(label,url,validate){
  try{
    const result=await get(url);
    validate(result);
    checked.push({label,url,status:result.status});
  }catch(error){fail(url,String(error?.message||error));}
}

const sitemapUrl=EXPECTED_SITEMAP;
await check('host-root-robots',ROOT+'/robots.txt',({status,content})=>{
  assert(status===200,'HOST ROOT robots.txt HTTP '+status);
  checkRootRobots(content);
});
let urls=[];
await check('sitemap',sitemapUrl,({status,content})=>{
  assert(status===200,'sitemap.xml HTTP '+status);
  assert(/<urlset\b/.test(content),'Sitemap XML urlset missing');
  urls=[...content.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
    .map(match=>match[1].replace(/&amp;/g,'&'));
  assert(urls.length>=10,'Sitemap unexpectedly small: '+urls.length);
  assert(new Set(urls).size===urls.length,'Duplicate sitemap URLs');
  assert(urls.every(url=>url.startsWith(PUBLIC+'/')),'Noncanonical sitemap URL found');
  assert(urls.every(url=>!/(?:\/2\/|\/3\/)$/.test(url)),'Continuation URL leaked into sitemap');
});

// The Pagero reverse proxy rewrites JSON quoted paths to /life/*. Verify the
// *actual public JSON payload*, not only local dist/search-index.json.
// A previous client fix prefixed these already-rewritten values twice.
let liveSearchItems=0, proxyPrefixedSearchItems=0;
await check('search-json-canonical-targets',PUBLIC+'/search-index.json',({status,headers,content})=>{
  assert(status===200,'Public search index HTTP '+status);
  assert(/json/i.test(headers.get('content-type')||''),'Search index is not JSON');
  const index=JSON.parse(content);
  assert(Array.isArray(index)&&index.length>=60,'Unexpected search index size');
  const sitemapUrls=new Set(urls);
  const checkedTargets=new Set();
  for(const item of index){
    assert(typeof item?.url==='string','Search result missing URL');
    const target=searchResultHref(item.url,PUBLIC+'/life-search.js');
    assert(sitemapUrls.has(target),
      'Search result navigates outside canonical sitemap: '+item.url+' => '+target);
    assert(!checkedTargets.has(target),'Duplicate canonical search result '+target);
    checkedTargets.add(target);
    if(item.url.startsWith('/life/'))proxyPrefixedSearchItems++;
  }
  liveSearchItems=index.length;
});
let cursor=0;
await Promise.all(Array.from({length:5},async()=>{
  while(cursor<urls.length){
    const url=urls[cursor++];
    await check('canonical-indexable',url,result=>ensureIndexable(result,url));
  }
}));
for(const relative of [
  '/car/car-inspection-period/2/',
  '/car/car-inspection-period/3/',
  '/support/child-allowance-2026/2/'
]){
  const url=PUBLIC+relative;
  if(urls.includes(url))fail(url,'Continuation URL leaked into public sitemap');
  await check('continuation-noindex',url,result=>ensureContinuationNoindex(result,url));
}
for(const relative of ['/','/car/car-inspection-period/','/support/child-allowance-2026/']){
  const old=LEGACY+relative+'?utm_source=seo-runtime-qa';
  const expected=PUBLIC+relative+'?utm_source=seo-runtime-qa';
  await check('legacy-301',old,({status,headers})=>{
    assert(status===301,'Expected legacy 301, got '+status);
    assert(new URL(headers.get('location')||'',old).href===expected,
      'Legacy Location incorrect: '+headers.get('location'));
  });
}
await check('origin-noindex',ORIGIN+'/',({status,headers,content})=>{
  assert(status===200,'Origin returned '+status);
  assert(/\bnoindex\b/i.test(headers.get('X-Robots-Tag')||'')
    || /\bnoindex\b/i.test(robotsMeta(content)),
    'Cloudflare raw origin unexpectedly indexable');
});
for(const relative of ['/','/car/car-inspection-period/']){
  const url='https://www.pagero.kr/life'+relative;
  const canonical=PUBLIC+relative;
  await check('www-noindex-or-redirect',url,result=>
    ensurePreviewIsNotIndexable(result,url,canonical));
}
await check('utility-noindex',PUBLIC+'/deals/',({status,content})=>{
  assert(status===200,'Deals utility returned '+status);
  assert(/\bnoindex\b/i.test(robotsMeta(content)),'Deals utility is indexable');
});
const eventUrl=PUBLIC+'/events/';
await check('event-index-policy',eventUrl,({status,content})=>{
  assert(status===200,'Event page returned '+status);
  const advertised=urls.includes(eventUrl);
  assert(advertised?!/\bnoindex\b/i.test(robotsMeta(content))
    :/\bnoindex\b/i.test(robotsMeta(content)),
    advertised?'Indexed event listing unexpectedly noindex':'Empty event page unexpectedly indexable');
});
await check('deployed-provenance',PUBLIC+'/deployment.json',result=>{
  const manifest=ensureDeploymentManifest(result,expectedCommit);
  deployedCommit=manifest.commit;
});
if(!urls.length)warnings.push('No sitemap URLs were available for indexability checks');
const report={
  auditedAt:new Date().toISOString(),
  publicBase:PUBLIC,
  rootRobots:ROOT+'/robots.txt',
  expectedCommit:expectedCommit||null,
  deployedCommit,
  indexableUrls:urls.length,
  liveSearchItems,
  proxyPrefixedSearchItems,
  transientRetries,
  checked:checked.length,
  checkedUrls:checked,
  warnings,errors
};
const reportPath=process.env.SEO_AUDIT_REPORT||'artifacts/seo-runtime-audit.json';
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('[seo-runtime] searchTargets='+liveSearchItems+' proxyPrefixed='+proxyPrefixedSearchItems+' transportRetries='+transientRetries);
console.log('[seo-runtime] checked='+checked.length+' sitemapURLs='+urls.length
  +' deployed='+ (deployedCommit||'unknown') +' errors='+errors.length);
for(const item of errors)console.error('[seo-runtime] FAIL '+item.url+' : '+item.reason);
for(const warning of warnings)console.warn('[seo-runtime] WARN '+warning);
if(errors.length)process.exitCode=1;
