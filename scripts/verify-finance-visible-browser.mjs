import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

const dist=path.resolve('dist');
const contentType={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const route=new URL(req.url,'http://localhost');
  let file=path.join(dist,route.pathname);
  if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':contentType[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const fail=message=>{throw new Error('[visible-rates-browser] '+message)};
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const root='http://127.0.0.1:'+server.address().port;
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox']});
const samples=[
  {bank:'테스트은행A',product:'검증용 정기예금',term:12,baseRate:3.35,maxRate:3.55,joinWay:'모바일',preferential:'전자금융 가입'},
  {bank:'테스트은행B',product:'검증용 정기예금2',term:12,baseRate:3.1,maxRate:3.6,joinWay:'방문',preferential:'급여이체'},
  {bank:'테스트은행C',product:'검증용 정기예금3',term:12,baseRate:3.0,maxRate:3.25,joinWay:'모바일',preferential:'자동이체'},
  {bank:'테스트은행D',product:'검증용 적금',term:6,baseRate:3.8,maxRate:4.0,joinWay:'모바일',preferential:''}
];
let passed=0;
async function routeFixture(page,success){
  await page.route('**/finance/api/products?**',route=>route.fulfill({
    status:success?200:503,contentType:'application/json',
    body:JSON.stringify(success?{status:'ok',count:samples.length,products:samples,retrievedAt:'2026-11-05T14:30:00Z'}:{status:'unconfigured'})
  }));
  await page.route('**/finance/api/issues',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({status:'ok',items:[{title:'공식자료',source:'한국은행',type:'경제·금리',url:'https://www.bok.or.kr/',publishedAt:'2026-11-05T12:00:00Z'}]})
  }));
}
const errors=[];
try{
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
    const page=await browser.newPage({viewport});
    page.on('pageerror',error=>errors.push(viewport.width+': '+error.message));
    await routeFixture(page,true);
    await page.goto(root+'/finance/savings/',{waitUntil:'domcontentloaded'});
    await page.locator('#finance-rates-official').scrollIntoViewIfNeeded();
    await page.locator('#finance-rate-panel').waitFor({state:'visible',timeout:12000});
    const mobile=viewport.width<=820;
    const rowSelector=mobile?'.finance-mobile-rate-card':'#finance-products tbody tr';
    await page.locator(rowSelector).first().waitFor({state:'visible'});
    const rows=await page.locator(rowSelector).count();
    if(rows!==3)fail('Visible rate items: '+rows+' on '+viewport.width+'px');
    const viewSelector=mobile?'.finance-mobile-rates':'.finance-desktop-rates';
    const visible=await page.locator(viewSelector).isVisible();
    if(!visible)fail('Rate results hidden on viewport '+viewport.width);
    const amount=await page.locator(viewSelector).first().innerText();
    if(!amount.includes('3.35%')||!amount.includes('테스트은행A'))
      fail('Verified numeric rate missing from visible '+(mobile?'mobile cards':'desktop table'));
    if(mobile){
      if(await page.locator('.finance-desktop-rates').isVisible())
        fail('Desktop-width table is still visible on mobile');
      const overflow=await page.locator('#finance-rate-panel').evaluate(node=>node.scrollWidth>node.clientWidth+2);
      if(overflow)fail('Rate panel overflows mobile viewport');
    }
    await page.locator('#finance-kind').selectOption('saving');
    await page.locator('#finance-term').selectOption('all');
    await page.locator(rowSelector).first().waitFor({state:'visible'});
    await page.goto(root+'/finance/',{waitUntil:'domcontentloaded'});
    await page.locator('#finance-rates-official').scrollIntoViewIfNeeded();
    await page.locator('#finance-rate-preview').waitFor({state:'visible',timeout:12000});
    const cards=await page.locator('.finance-preview-card').count();
    if(cards!==3)fail('Hub fails to show 3 real-rate cards: '+cards);
    if(!(await page.locator('.finance-preview-rate').first().innerText()).includes('3.35%'))
      fail('Finance hub lacks fetched percent');
    await page.close();passed++;
  }
  const page=await browser.newPage();
  await routeFixture(page,false);
  await page.goto(root+'/finance/savings/',{waitUntil:'domcontentloaded'});
  await page.locator('#finance-rates-official').waitFor({state:'visible',timeout:10000});
  if(await page.locator('#finance-rate-panel').isVisible())
    fail('Unverified data table must stay hidden');
  await page.close();passed++;
  if(errors.length)fail('JS errors: '+errors.join(' | '));
  console.log('[visible-rates-browser] PASS '+passed+' paths: desktop table, mobile visible card list without horizontal overflow, real finance homepage rates, and no-data fallback.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
