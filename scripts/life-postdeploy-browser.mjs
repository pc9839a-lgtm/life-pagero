import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { searchResultHref } from '../public/life-search-core.js';

// GitHub push/main only: verify the actual Cloudflare + Pagero reverse-proxy
// deployment AFTER the deployed commit equals the merge commit.
// PR browser QA remains separate and tests its own newly built dist.
const SITE='https://pagero.kr/life';
const SHA=String(process.env.EXPECTED_SHA||process.env.GITHUB_SHA||'').trim();
const MAX_WAIT=Math.max(0,Math.min(600000,Number(process.env.LIFE_DEPLOY_WAIT_MS||480000)));
const REPORT='artifacts/life-production-browser-audit.json';
const SHOTS='artifacts/life-production-browser';
const errors=[],checks=[],warnings=[],screenshots=[],assetErrors=[],scriptErrors=[];
let deployedSha=null;
let attempts=0;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(ok,label,detail=''){
  if(ok){checks.push(label);console.log('[production-browser] PASS '+label);}
  else {errors.push({label,detail});console.error('[production-browser] FAIL '+label+' '+detail);}
}
async function request(url,ms=15000){
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(ms),
    headers:{'User-Agent':'LifePageroProductionQA/1.0','Cache-Control':'no-cache'}});
  const text=await response.text();
  return {status:response.status,headers:response.headers,text};
}
async function waitForDeployment(){
  if(!/^[0-9a-f]{40}$/i.test(SHA))throw Error('EXPECTED_SHA must be the exact merged main SHA');
  const deadline=Date.now()+MAX_WAIT;
  let last='not yet checked';
  do{
    attempts++;
    try{
      const reply=await request(SITE+'/deployment.json',12000);
      if(reply.status!==200)throw Error('Deployment manifest HTTP '+reply.status);
      const manifest=JSON.parse(reply.text);
      if(manifest.repository!=='pc9839a-lgtm/life-pagero' ||
        manifest.branch!=='main'||manifest.environment!=='cloudflare-pages')
        throw Error('Unexpected deployment source: '+reply.text.slice(0,250));
      deployedSha=manifest.commit;
      last=String(deployedSha||'missing');
      if(deployedSha?.toLowerCase()===SHA.toLowerCase()) {
        check(true,'deployment-sha-equals-merge-sha');
        return;
      }
    }catch(error){last=String(error.message||error);}
    if(Date.now()+15000>deadline)break;
    console.log('[production-browser] waiting for Cloudflare main deployment; observed='+last+
      ' expected='+SHA+' attempt='+attempts);
    await delay(15000);
  }while(Date.now()<deadline);
  throw Error('Cloudflare deployment did not match the main merge commit within '+
    MAX_WAIT+'ms; observed='+last+' expected='+SHA+'. Do NOT claim deployed.');
}
async function auditMetadata(){
  const loanModule=await request(SITE+'/finance-loan-math.mjs');
  check(loanModule.status===200 &&
    /(?:text|application)\/(?:javascript|ecmascript)/i.test(loanModule.headers.get('content-type')||'') &&
    loanModule.text.includes('export function loanSchedule'),
    'real-loan-esm-mime',
    'HTTP='+loanModule.status+' MIME='+loanModule.headers.get('content-type'));
  const deployment=await request(SITE+'/deployment.json');
  check(deployment.status===200 && /no-store/i.test(deployment.headers.get('cache-control')||''),
    'fresh-deployment-manifest','Expected no-store but received: '+deployment.headers.get('cache-control'));
  const [robots,sitemap,rss,index,search,home,unknown,origin]=await Promise.all([
    request('https://pagero.kr/robots.txt'),
    request(SITE+'/sitemap.xml'),
    request(SITE+'/rss.xml'),
    request(SITE+'/search-index.json'),
    request(SITE+'/search/'),
    request(SITE+'/'),
    request(SITE+'/__life_qa_missing_route_404__/'),
    request('https://life-pagero.pages.dev/')
  ]);
  check(robots.status===200 && robots.text.includes(SITE+'/sitemap.xml'),
    'root-robots-sitemap','Root robots does not reference LIFE sitemap');
  const urls=[...sitemap.text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)]
    .map(match=>match[1].trim().replaceAll('&amp;','&'));
  check(sitemap.status===200 && urls.length>=75 && new Set(urls).size===urls.length &&
    urls.every(url=>url.startsWith(SITE+'/')),'canonical-sitemap',
    'HTTP '+sitemap.status+' entries='+urls.length);
  check(rss.status===200 && /application\/rss\+xml/i.test(rss.headers.get('content-type')||'') &&
    (rss.text.match(/<item>/g)||[]).length>=62,'real-rss-feed',
    'HTTP '+rss.status+' type='+rss.headers.get('content-type'));
  let records=[];
  try{records=JSON.parse(index.text)}catch(e){
    errors.push({label:'search-index-parse',detail:String(e.message||e)});
  }
  const expected=new Set(urls);
  let targets=[];
  if(Array.isArray(records)){
    try{targets=records.map(record=>searchResultHref(record.url,SITE+'/life-search.js'));}
    catch(e){errors.push({label:'search-index-targets',detail:String(e.message||e)});}
  }
  check(index.status===200 && Array.isArray(records) && records.length>=75 &&
    targets.length===records.length && new Set(targets).size===targets.length &&
    targets.every(url=>expected.has(url)),'real-search-index',
    'HTTP '+index.status+' indexed='+records.length+' validTargets='+targets.length);
  check(search.status===200 && /\bnoindex\b/i.test(search.text.match(/<meta\b[^>]*name="robots"[^>]*>/i)?.[0]||''),
    'search-noindex','Search page status or robots policy invalid');
  check(home.status===200 && home.headers.get('x-pagero-life-proxy')==='1' &&
    !/\bnoindex\b/i.test(home.headers.get('x-robots-tag')||''),
    'canonical-proxy-indexable','Public proxy header/robots invalid');
  check(unknown.status===404,'unknown-url-404',
    'Unknown URL should return HTTP 404, got '+unknown.status);
  check(origin.status===200 && /\bnoindex\b/i.test(origin.headers.get('x-robots-tag')||''),
    'origin-noindex','Raw Pages origin should not be indexable');
  return {sitemapUrls:urls.length,searchItems:records.length,rssItems:(rss.text.match(/<item>/g)||[]).length};
}
async function auditBrowser(){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  let page=null;
  try{
    page=await browser.newPage({viewport:{width:360,height:780},deviceScaleFactor:1});
    page.on('pageerror',error=>{
      const message=String(error.stack||error.message||error);
      scriptErrors.push(message);
    });
    page.on('response',response=>{
      const url=response.url();
      if(url.startsWith(SITE+'/') &&
        /\.(?:css|js|json|svg|webp|png|jpeg|jpg|woff2)(?:\?|$)/.test(url) &&
        response.status()>=400)assetErrors.push({url,status:response.status()});
    });
    async function open(route,label){
      const response=await page.goto(SITE+route,{waitUntil:'domcontentloaded',timeout:25000});
      check(response?.status()===200,label+'-http','Status='+response?.status());
      await page.locator('h1').first().waitFor({state:'visible',timeout:12000});
      const state=await page.evaluate(()=>({
        width:window.innerWidth,
        documentWidth:document.documentElement.scrollWidth,
        bodyWidth:document.body.scrollWidth,
        canonical:document.querySelector('link[rel="canonical"]')?.href||'',
        h1:document.querySelectorAll('h1').length,
        stylesheets:document.querySelectorAll('link[rel="stylesheet"]').length,
      }));
      check(state.documentWidth<=state.width+8 && state.bodyWidth<=state.width+8,
        label+'-responsive','Overflow: '+JSON.stringify(state));
      check(state.h1===1 && state.stylesheets>0,label+'-markup',
        'H1/styles: '+JSON.stringify(state));
      check(state.canonical===SITE+route.split(/[?#]/)[0],
        label+'-canonical','Canonical='+state.canonical);
      return state;
    }
    async function snapshot(label){
      try{
        const file=path.join(SHOTS,label+'.png');
        await page.screenshot({path:file,fullPage:false,timeout:10000});
        screenshots.push(file);
      }catch(e){warnings.push('Screenshot failed '+label+': '+String(e.message||e));}
    }
    for(const width of [360,390,1280]){
      await page.setViewportSize({width,height:width===1280?840:780});
      await open('/','home-'+width);
      if(width===360||width===1280)await snapshot('home-'+width);
      await open('/car/car-inspection-period/','article-'+width);
      await open('/finance/savings-calculator/','savings-'+width);
      if(width===390)await open('/food/','food-'+width);
    }
    await page.setViewportSize({width:360,height:780});
    await open('/search/?q='+encodeURIComponent('대출 이자 계산'),'search');
    try{
      const results=page.locator('#search-results .search-result a');
      await results.first().waitFor({timeout:15000});
      const links=await results.evaluateAll(elements=>elements.map(a=>a.href));
      check(links.length>0 && links.every(link=>link.startsWith(SITE+'/')&&!link.includes('/life/life/')),
        'search-browser-links','Bad result links: '+JSON.stringify(links.slice(0,5)));
      const loan=page.locator('#search-results .search-result a[href*="/life/finance/loan-payment/"]').first();
      check(await loan.count()===1,'search-loan-result');
      if(await loan.count()){
        await Promise.all([
          page.waitForURL('**/life/finance/loan-payment/',{timeout:12000}),
          loan.click()
        ]);
        await page.locator('h1').first().waitFor({timeout:12000});
        check(new URL(page.url()).pathname==='/life/finance/loan-payment/',
          'search-browser-click','Clicked to '+page.url());
      }
    }catch(e){errors.push({label:'search-browser-interaction',detail:String(e.message||e)});}
    await open('/finance/savings-calculator/','savings-interaction');
    try{
      const output=page.locator('#savings-maturity');
      const original=await output.innerText();
      await page.locator('#savings-monthly').fill('300000');
      const modified=await output.innerText();
      check(original.includes('원')&&modified.includes('원')&&original!==modified,
        'real-savings-calculation',original+' -> '+modified);
    }catch(e){errors.push({label:'real-savings-calculation',detail:String(e.message||e)});}
    await open('/finance/mortgage-calculator/','mortgage-live');
    try{
      const initial=await page.locator('#mortgage-limit').innerText();
      await page.locator('#mortgage-annual-income').fill('2000');
      const revised=await page.locator('#mortgage-limit').innerText();
      check(initial.includes('만원') && revised.includes('만원') && initial!==revised,
        'real-mortgage-change','Income did not change lending estimate: '+initial+' -> '+revised);
    }catch(e){errors.push({label:'real-mortgage-change',detail:String(e.message||e)});}

    await open('/finance/loan-payment/','loan-live');
    try{
      const result=page.locator('#portal-loan-result .loan-result-primary strong');
      const original=await result.innerText();
      const input=page.locator('#loan-principal');
      await input.fill(String(Number(await input.inputValue())+10000000));
      const changed=await result.innerText();
      check(original.includes('원') && changed.includes('원') && original!==changed,
        'real-loan-payment-change','Loan payment unchanged: '+original+' -> '+changed);
    }catch(e){errors.push({label:'real-loan-payment-change',detail:String(e.message||e)});}

    await open('/tools/car-cost/','car-live');
    try{
      const result=page.locator('#car-cost-monthly');
      const original=await result.innerText();
      await page.locator('#car-annual-km').fill('25000');
      const changed=await result.innerText();
      check(original.includes('원') && changed.includes('원') && original!==changed,
        'real-car-cost-change','Car cost unchanged: '+original+' -> '+changed);
    }catch(e){errors.push({label:'real-car-cost-change',detail:String(e.message||e)});}

    await open('/search/','search-form-live');
    try{
      await page.locator('#page-search').fill('주거급여');
      await page.locator('#page-search-form button').click();
      await page.locator('#search-results .search-result a').first().waitFor({timeout:12000});
      check(new URL(page.url()).searchParams.get('q')==='주거급여',
        'real-search-submit-query','Query parameter not updated');
    }catch(e){errors.push({label:'real-search-form-submit',detail:String(e.message||e)});}

    await open('/car/car-inspection-period/','toc-interaction');
    try{
      const anchors=page.locator('.life-guide-jumps a');
      check(await anchors.count()===3,'real-guide-section-count');
      for(let i=0;i<3;i++){
        await anchors.nth(i).click();
        check(new URL(page.url()).hash==='#life-guide-part-'+(i+1),
          'real-guide-jump-'+(i+1),'Hash='+new URL(page.url()).hash);
      }
    }catch(e){errors.push({label:'real-guide-navigation',detail:String(e.message||e)});}

    await open('/food/','seasonal-food-live');
    try{
      const expected=String(Number(new Intl.DateTimeFormat('en-US',{
        month:'numeric',timeZone:'Asia/Seoul'
      }).format(new Date())));
      check(await page.locator('#food-month').inputValue()===expected,
        'real-food-current-kst-month','Food picker starts on stale month');
      await page.locator('#food-month').selectOption('12');
      check((await page.locator('#food-list .food-card').first().innerText()).includes('굴'),
        'real-food-month-change','December options were not rendered');
      await page.locator('#food-list .food-card').first().locator('summary').click();
      await page.locator('#food-list .food-card').first()
        .locator('button.food-add-basket').click();
      check(await page.locator('#food-shopping-list .food-shopping-row').count()>0,
        'real-food-shopping-add','Food grocery list stayed empty');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#food-shopping-list .food-shopping-row').first()
        .waitFor({timeout:12000});
      check(await page.locator('#food-shopping-list .food-shopping-row').count()>0,
        'real-food-shopping-persist','Grocery list did not persist');
      await page.locator('#food-clear-all').click();
      check(await page.locator('#food-shopping-list .food-shopping-row').count()===0,
        'real-food-shopping-delete','Saved grocery list did not clear');
    }catch(e){errors.push({label:'real-food-shopping-flow',detail:String(e.message||e)});}

    await snapshot('search-and-article-mobile');
  }finally{
    await page?.close();
    await browser.close();
  }
  check(assetErrors.length===0,'same-origin-assets',
    'Missing assets: '+JSON.stringify(assetErrors.slice(0,8)));
  const appErrors=scriptErrors.filter(message=>/\/life\/|life-search|life-compact|savings-calculator|finance-loan/.test(message));
  if(scriptErrors.length && !appErrors.length)
    warnings.push('Third-party script errors: '+scriptErrors.length);
  check(appErrors.length===0,'first-party-js-errors',appErrors.slice(0,4).join('\n'));
}
fs.mkdirSync(SHOTS,{recursive:true});
const detail={expectedSha:SHA,actualSha:null,attempts:0,
  checks:[],errors:[],warnings:[],screenshots:[],counts:{}};
try{
  await waitForDeployment();
  detail.counts=await auditMetadata();
  await auditBrowser();
}catch(e){
  errors.push({label:'audit-execution',detail:String(e.stack||e)});
}finally{
  detail.actualSha=deployedSha;
  detail.attempts=attempts;
  detail.checks=checks;
  detail.errors=errors;
  detail.warnings=warnings;
  detail.screenshots=screenshots;
  fs.mkdirSync(path.dirname(REPORT),{recursive:true});
  fs.writeFileSync(REPORT,JSON.stringify(detail,null,2)+'\n');
  console.log('[production-browser] '+checks.length+' passed, '+errors.length+
    ' failed, deployed='+String(deployedSha||'unknown')+' expected='+SHA);
}
if(errors.length)process.exitCode=1;
