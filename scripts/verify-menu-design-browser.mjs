import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright-core';

const DIST=path.resolve('dist'),OUT=path.resolve('artifacts/menu-design');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  let file=path.resolve(DIST,'.'+pathname);
  if(file!==DIST&&!file.startsWith(DIST+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const expect=(condition,message)=>{if(!condition)throw Error('[menu-visual] '+message);};
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const root='http://127.0.0.1:'+server.address().port;
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const routes=[
  {slug:'finance',path:'/finance/',main:'.finance-index-services',item:'.finance-index-tile'},
  {slug:'topics',path:'/topics/',main:'.topics-hub-list',item:'.topics-hub-link'},
  {slug:'car',path:'/car/',main:'.modern-list-toolbar',item:'.post-list .post-card'},
  {slug:'support',path:'/support/',main:'.modern-list-toolbar',item:'.post-list .post-card'},
  {slug:'food',path:'/food/',main:'.food-hero-lead',item:'.food-card'},
  {slug:'events',path:'/events/',main:'.events-filters',item:'.events-empty, .events-card'},
  {slug:'deals',path:'/deals/',main:'.adpick-search',item:'.adpick-products'},
  {slug:'real-estate',path:'/real-estate/',main:'.re-filter-panel',item:'.re-card'}
];
let verified=0;
try{
 for(const viewport of [{width:1280,height:820},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  for(const route of routes){
   const response=await page.goto(root+route.path,{waitUntil:'domcontentloaded',timeout:30000});
   expect(response?.status()===200,route.slug+' returned '+response?.status());
   expect(await page.locator('h1').count()===1,route.slug+' should have one heading');
   expect(await page.locator('.main-nav a').count()===8,route.slug+' should have eight top-level routes');
   expect(await page.locator(route.main).first().isVisible(),route.slug+' main UI not visible');
   expect(await page.locator(route.item).count()>0,route.slug+' has no layout items');
   const bodyWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   expect(bodyWidth<=viewport.width+3,route.slug+' horizontal page overflow '+bodyWidth+' / '+viewport.width);
   if(route.slug==='topics'){
    expect(await page.locator('.topics-hub-link').count()===7,'six directories plus the car calculator required');
    const columns=await page.locator('.topics-hub-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
    expect(columns===(viewport.width>900?4:1),'directory grid columns '+columns+' at '+viewport.width);
    expect(await page.locator('.topics-quick a').count()===3,'quick information links missing');
    const featured=await page.locator('.topics-hub-link').first().evaluate(el=>getComputedStyle(el).backgroundColor);
    expect(featured==='rgb(32, 40, 50)','featured lifestyle category lacks distinct contrast: '+featured);
   }
   if(route.slug==='finance'){
    expect(await page.locator('.finance-index-tile').count()===6,'finance destinations changed');
    const grid=await page.locator('.finance-index-services').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
    expect(grid===(viewport.width>860?3:1),'finance directory must use three columns on desktop and one on mobile: '+grid+' at '+viewport.width);
    const hero=await page.locator('.finance-index-hero').evaluate(el=>{
      const style=getComputedStyle(el),bounds=el.getBoundingClientRect();
      return {height:bounds.height,background:style.backgroundColor,alignment:style.textAlign,borderTop:style.borderTopWidth};
    });
    expect(hero.alignment==='left','finance introduction must be left aligned');
    expect(hero.background==='rgba(0, 0, 0, 0)','finance introduction must have no dark splash background: '+hero.background);
    expect(hero.borderTop==='0px','finance introduction must have no decorative top stripe');
    expect(hero.height<185,'finance hero should not push the actual tools below the fold: '+hero.height);
    expect(await page.locator('.finance-index-primary, .finance-index-tile-number, .finance-index-eyebrow').count()===0,
      'marketing-only finance decoration returned');
    expect(await page.locator('.finance-index-services .finance-index-tile').first().getAttribute('href')==='/finance/savings/',
      'first finance destination broken');
   }
   if(route.slug==='food')
    expect(await page.locator('.food-card').first().evaluate(e=>getComputedStyle(e).borderTopStyle)!=='none','food cards missing defined boundary');
   if(route.slug==='real-estate')
    expect(await page.locator('.re-card').count()===3,'real-estate samples unexpectedly changed');
   await page.screenshot({path:path.join(OUT,route.slug+'-'+viewport.width+'.png'),fullPage:true});
   verified++;
  }
  await page.close();
 }
 console.log('[menu-visual] PASS '+verified+' desktop and mobile screens; hierarchy, quick actions, visible nav, content, no horizontal overflow and screenshots');
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
