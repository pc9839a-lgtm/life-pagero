import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

// Full-browser regression for the FINAL generated distribution. Simulate the
// public /life/ reverse proxy, including its crucial HTML/JSON path rewrite.
// This is not a substitute for checking the actual deployed Cloudflare commit.
const DIST=path.resolve('dist');
const OUTPUT=path.resolve('artifacts/life-browser');
const MIME={
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.xml':'application/xml; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.woff2':'font/woff2',
  '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8'
};
const failures=[],checks=[],browserErrors=[],missingAssets=[];
function fail(label,message){failures.push({label,message});console.error('[browser-qa] FAIL '+label+': '+message);}
function pass(label){checks.push(label);console.log('[browser-qa] PASS '+label);}
function expect(condition,label,message){if(condition)pass(label);else fail(label,message);}
function proxyRewrite(text,type){
  if(type.includes('text/html')||type.includes('application/json')||
     type.includes('application/manifest+json')){
    return text.replace(/(["'])\/(?!\/|life(?:\/|["']))/g,'$1/life/');
  }
  if(type.includes('text/css')){
    return text.replace(/(["'])\/(?!\/|life(?:\/|["']))/g,'$1/life/')
      .replace(/url\(\s*\/(?!\/|life\/)/gi,'url(/life/')
      .replace(/@import\s+\/((?!\/|life\/)[^;\s]+)/gi,'@import /life/$1');
  }
  return text;
}

const server=http.createServer((req,res)=>{
  try{
    const reqUrl=new URL(req.url,'http://127.0.0.1');
    if(!reqUrl.pathname.startsWith('/life/')){
      res.writeHead(404);res.end('Not found outside /life/');return;
    }
    let relative=decodeURIComponent(reqUrl.pathname.slice('/life/'.length));
    if(!relative)relative='index.html';
    if(relative.endsWith('/'))relative+='index.html';
    const target=path.resolve(DIST,relative);
    if(!target.startsWith(DIST+path.sep)||!fs.existsSync(target)
        ||!fs.statSync(target).isFile()){
      res.writeHead(404,{'content-type':'text/html'});
      res.end(fs.readFileSync(path.join(DIST,'404.html')));return;
    }
    const mime=MIME[path.extname(target)]||'application/octet-stream';
    const binary=!/(?:html|css|javascript|json|xml|text\/plain|manifest)/.test(mime);
    const value=binary?fs.readFileSync(target):
      Buffer.from(proxyRewrite(fs.readFileSync(target,'utf8'),mime),'utf8');
    res.writeHead(200,{'content-type':mime,'x-pagero-life-proxy':'test'});
    res.end(value);
  }catch(error){
    res.writeHead(500);res.end('Browser QA local server error');
    fail('local-server',String(error.message||error));
  }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/life';
let browser;
let page;
const screenshots=[];
async function screenshot(label){
  try{
    const filename=path.join(OUTPUT,label+'.png');
    await page.screenshot({path:filename,fullPage:true,timeout:9000});
    screenshots.push(filename);
  }catch(error){fail(label+'-screenshot',String(error.message||error));}
}
async function open(route,label){
  const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
  expect(response?.status()===200,label+'-http','HTTP '+response?.status());
  await page.waitForTimeout(180);
  return response;
}
async function inspectLayout(route,viewport){
  const label='layout-'+viewport.width+'-'+route;
  await open(route,label);
  const sizes=await page.evaluate(()=>({
    window:window.innerWidth,
    html:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
    title:document.title,
    h1:document.querySelectorAll('h1').length,
    main:!!document.querySelector('main'),
    css:document.querySelectorAll('link[rel="stylesheet"]').length,
    canonical:document.querySelector('link[rel="canonical"]')?.href,
    links:[...document.querySelectorAll('a[href^="/"]')]
      .filter(a=>!a.getAttribute('href').startsWith('/life/')).slice(0,4)
      .map(a=>a.getAttribute('href')),
  }));
  expect(sizes.h1===1,label+'-heading','Expected 1 H1; got '+sizes.h1);
  expect(sizes.main,label+'-main','Missing main landmark');
  expect(sizes.css>0,label+'-css','Stylesheets are absent');
  expect(sizes.html<=sizes.window+8&&sizes.body<=sizes.window+8,
    label+'-overflow','Horizontal viewport overflow: '+JSON.stringify(sizes));
  expect(sizes.links.length===0,label+'-proxied-links',
    'Broken root-relative links: '+JSON.stringify(sizes.links));
  expect(sizes.canonical?.startsWith('https://pagero.kr/life/'),
    label+'-canonical','Canonical mismatch: '+sizes.canonical);
  if(viewport.width===360&&['/','/search/?q=대출','/finance/savings-calculator/'].includes(route)){
    await screenshot('mobile-'+route.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,''));
  }
}
try{
  fs.mkdirSync(OUTPUT,{recursive:true});
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:360,height:760},deviceScaleFactor:1});
  page.on('pageerror',error=>browserErrors.push(String(error.message||error)));
  page.on('response',response=>{
    const url=response.url();
    if(url.startsWith(base+'/') &&
      /\.(?:js|mjs|css|json|svg|png|webp|jpg|woff2)(?:\?|$)/.test(url)
      && response.status()>=400)
      missingAssets.push({url,status:response.status()});
  });
  // A missing JS MIME mapping silently disables imported ESM without pageerror.
  // Explicitly check the module imported by the full loan calculator.
  const mathResponse=await page.request.get(base+'/finance-loan-math.mjs');
  expect(mathResponse.status()===200,'loan-math-module-http',
    'Loan calculation ESM returned '+mathResponse.status());
  expect(/javascript|ecmascript/.test(mathResponse.headers()['content-type']||''),
    'loan-math-module-mime',
    'Loan calculation ESM served an unsafe MIME: '+mathResponse.headers()['content-type']);
  for(const width of [360,390,1280]){
    const viewport={width,height:width===1280?850:760};
    await page.setViewportSize(viewport);
    const routes=width===390?['/','/search/?q=대출','/car/car-inspection-period/','/food/']:
      ['/', '/search/?q=대출','/car/car-inspection-period/','/food/',
       '/finance/savings-calculator/','/tools/car-cost/','/finance/mortgage-calculator/'];
    for(const route of routes)await inspectLayout(route,viewport);
  }

  await page.setViewportSize({width:360,height:760});
  await open('/search/?q='+encodeURIComponent('대출 이자 계산'),'search-query');
  try{
    await page.locator('#search-results .search-result a').first().waitFor({timeout:13000});
    const hits=await page.locator('#search-results .search-result a').count();
    expect(hits>0,'search-results-present','No results after module import and JSON fetch');
    const links=await page.locator('#search-results .search-result a').evaluateAll(anchors=>
      anchors.map(a=>a.href));
    expect(links.every(h=>h.startsWith(base+'/')&&!h.includes('/life/life/')),
      'search-result-canonical','Invalid click URL: '+JSON.stringify(links.slice(0,4)));
    const link=page.locator('#search-results .search-result a[href*="finance/loan-payment/"]').first();
    expect(await link.count()>0,'search-loan-discovery','Loan calculator missing from results');
    if(await link.count()){
      await link.click();
      expect(new URL(page.url()).pathname==='/life/finance/loan-payment/',
        'search-result-click','Actual browser navigation wrong: '+page.url());
      await page.locator('h1').first().waitFor({state:'visible',timeout:10000});
      expect(await page.locator('h1').count()===1,'search-destination-content','Missing destination H1');
    }
  }catch(error){fail('search-interaction',String(error.message||error));}

  await open('/finance/savings-calculator/','savings-calculator');
  try{
    const original=await page.locator('#savings-maturity').innerText();
    expect(original.includes('원'),'savings-initial-calculation','Savings calculator did not initialize: '+original);
    await page.locator('#savings-monthly').fill('300000');
    const revised=await page.locator('#savings-maturity').innerText();
    expect(revised.includes('원')&&revised!==original,
      'savings-input-change','Savings calculation did not update on input: '+original+' -> '+revised);
  }catch(error){fail('savings-interaction',String(error.message||error));}
  await open('/tools/car-cost/','car-cost-calculator');
  try{
    const value=await page.locator('#car-cost-monthly').innerText();
    expect(value.includes('원'),'car-cost-calculation','Car cost calculation missing: '+value);
  }catch(error){fail('car-cost-interaction',String(error.message||error));}


  // Exercise real financial calculation changes, not merely visible results.
  await open('/finance/mortgage-calculator/','mortgage-calculator-interaction');
  try{
    const before=await page.locator('#mortgage-limit').innerText();
    await page.locator('#mortgage-annual-income').fill('2000');
    const after=await page.locator('#mortgage-limit').innerText();
    expect(before.includes('만원') && after.includes('만원') && before!==after,
      'mortgage-income-affects-limit','Expected mortgage income to change loan limit: '+before+' -> '+after);
    expect(await page.locator('#mortgage-error').isHidden(),
      'mortgage-no-calculation-error','Mortgage validation error after valid income');
  }catch(error){fail('mortgage-interaction',String(error.message||error));}

  await open('/finance/loan-payment/','loan-payment-interaction');
  try{
    const initial=await page.locator('#portal-loan-result .loan-result-primary strong').innerText();
    const principal=page.locator('#loan-principal');
    const original=Number(await principal.inputValue());
    await principal.fill(String(original+10000000));
    const changed=await page.locator('#portal-loan-result .loan-result-primary strong').innerText();
    expect(initial.includes('원') && changed.includes('원') && changed!==initial,
      'loan-principal-affects-payment','Changing principal must change monthly payment: '+initial+' -> '+changed);
  }catch(error){fail('loan-payment-interaction',String(error.message||error));}

  await open('/tools/car-cost/','car-cost-input-interaction');
  try{
    const original=await page.locator('#car-cost-monthly').innerText();
    await page.locator('#car-annual-km').fill('25000');
    const modified=await page.locator('#car-cost-monthly').innerText();
    expect(original.includes('원') && modified.includes('원') && modified!==original,
      'car-distance-affects-cost','Car cost unchanged after distance edit: '+original+' -> '+modified);
    await page.locator('#car-fuel').selectOption('electric');
    expect((await page.locator('#car-unit-label').innerText()).includes('kWh'),
      'car-electric-units','Switching to EV failed to update units');
    expect((await page.locator('#car-cost-monthly').innerText()).includes('원'),
      'car-electric-calculation','EV estimate not calculated');
  }catch(error){fail('car-cost-input-interaction',String(error.message||error));}

  await open('/search/','search-submit-interaction');
  try{
    await page.locator('#page-search').fill('주거급여');
    await page.locator('#page-search-form button').click();
    await page.locator('#search-results .search-result a').first().waitFor({timeout:12000});
    const query=new URL(page.url()).searchParams.get('q');
    expect(query==='주거급여','search-form-updates-query','Search URL missing submitted keyword '+query);
    const urls=await page.locator('#search-results .search-result a').evaluateAll(
      nodes=>nodes.map(node=>node.href));
    expect(urls.length>0 && urls.every(url=>url.startsWith(base+'/')&&!url.includes('/life/life/')),
      'search-form-valid-results','Invalid search result links '+JSON.stringify(urls.slice(0,3)));
  }catch(error){fail('search-form-interaction',String(error.message||error));}

  await open('/','home-nav-interaction');
  try{
    const nav=page.locator('nav.main-nav');
    expect(await nav.locator('a').count()===8,'home-nav-eight-services','Site navigation item count changed');
    const finance=nav.locator('a[href$="/finance/"]');
    expect(await finance.count()===1,'home-finance-navigation-present',
      'Finance menu link unavailable');
    if(await finance.count()){
      await finance.click();
      await page.locator('h1').first().waitFor({state:'visible',timeout:10000});
      expect(new URL(page.url()).pathname==='/life/finance/',
        'home-finance-navigation-click','Menu navigated outside LIFE: '+page.url());
    }
  }catch(error){fail('home-navigation-interaction',String(error.message||error));}

  await open('/car/car-inspection-period/','guide-contents');
  try{
    const links=page.locator('.life-guide-jumps a');
    expect(await links.count()===3,'article-section-navigation','Expected 3 actual article sections');
    if(await links.count()===3){
      for(let i=0;i<3;i++){
        await links.nth(i).click();
        expect(new URL(page.url()).hash==='#life-guide-part-'+(i+1),
          'article-anchor-click-'+(i+1),'Guide anchor click failed: '+page.url());
      }
      const full=page.locator('.compact-read[data-compact-open="true"]');
      if(await full.count()){
        await full.first().click();
        expect(new URL(page.url()).hash==='#compact-full-guide',
          'article-read-full-action','Original read-full link lost its anchor');
      }
    }
  }catch(error){fail('article-interaction',String(error.message||error));}

  expect(missingAssets.length===0,'static-asset-delivery',
    'Static 4xx responses: '+JSON.stringify(missingAssets.slice(0,10)));
  expect(browserErrors.length===0,'browser-uncaught-errors',
    'Uncaught page errors: '+JSON.stringify(browserErrors.slice(0,8)));
}catch(error){
  fail('browser-runtime',String(error.stack||error));
}finally{
  try{await page?.close();await browser?.close();}catch{}
  await new Promise(resolve=>server.close(resolve));
  const report={at:new Date().toISOString(),checks:checks.length,failures,
    missingAssets,browserErrors,screenshots:screenshots.map(p=>path.relative(process.cwd(),p))};
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/life-integrated-browser-qa.json',JSON.stringify(report,null,2)+'\n');
  console.log('[browser-qa] '+checks.length+' checks, '+failures.length+
    ' failures, '+screenshots.length+' screenshots.');
}
if(failures.length)process.exitCode=1;
