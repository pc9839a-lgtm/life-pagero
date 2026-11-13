import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright-core';

const DIST=path.resolve('dist'),OUT=path.resolve('artifacts/menu-design');
// Run against the deployed public site without rebuilding 28 Wikimedia-backed
// images. Local mode remains available for source-branch visual checks.
const liveBase=(process.env.LIFE_VISUAL_BASE_URL||'').trim().replace(/\/+$/,'');
if(liveBase && !['https://pagero.kr/life','https://life.pagero.kr'].includes(liveBase))
  throw Error('[menu-visual] Unsupported deployed site URL: '+liveBase);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=liveBase?null:http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  let file=path.resolve(DIST,'.'+pathname);
  if(file!==DIST&&!file.startsWith(DIST+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const expect=(condition,message)=>{if(!condition)throw Error('[menu-visual] '+message);};
if(server)await new Promise(done=>server.listen(0,'127.0.0.1',done));
const root=liveBase||('http://127.0.0.1:'+server.address().port);
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
 for(const viewport of [{width:1280,height:820},{width:390,height:844},{width:320,height:720}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  for(const route of routes){
   // Include both landing pages on 320px devices without extending the audit
   // of unrelated menus beyond the established desktop/mobile breakpoints.
   if(viewport.width===320 && route.slug!=='topics' && route.slug!=='finance')continue;
   const response=await page.goto(root+route.path,{waitUntil:'domcontentloaded',timeout:30000});
   if(liveBase&&route.slug==='topics'){
     const links=await page.locator('.topics-hub-list a').evaluateAll(nodes=>
       nodes.map(n=>({label:n.querySelector('strong')?.textContent||'',href:n.href})));
     console.log('[menu-live] Lifestyle destination URLs:',JSON.stringify(links));
   }
   // Always capture the page before assertions so a failed screen still has
   // a screenshot attached to its workflow job.
   await page.screenshot({path:path.join(OUT,route.slug+'-'+viewport.width+'.png'),fullPage:true});
   expect(response?.status()===200,route.slug+' returned '+response?.status());
   expect(await page.locator('h1').count()===1,route.slug+' should have one heading');
   expect(await page.locator('.main-nav a').count()===8,route.slug+' should have eight top-level routes');
   expect(await page.locator(route.main).first().isVisible(),route.slug+' main UI not visible');
   expect(await page.locator(route.item).count()>0,route.slug+' has no layout items');
   const bodyWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   expect(bodyWidth<=viewport.width+3,route.slug+' horizontal page overflow '+bodyWidth+' / '+viewport.width);
   if(route.slug==='topics'){
    expect(await page.locator('script[src*="finance-live.js"],link[href*="finance-experience.css"]').count()===0,
      'lifestyle directory still downloads inherited finance-only assets');
    const loadedFinance=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>/finance-live\.js|finance-experience\.css/.test(x.name)).map(x=>x.name));
    expect(loadedFinance.length===0,'lifestyle route has redundant finance network requests: '+loadedFinance);
    expect(await page.locator('.topics-hub-link').count()===7,'six distinct categories and one calculator must remain');
    expect(await page.locator('.topics-icon').count()===7,'topic icons missing');
    const columns=await page.locator('.topics-hub-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
    const expectedColumns=viewport.width>900?3:viewport.width>360?2:1;
    expect(columns===expectedColumns,'topics columns '+columns+' != '+expectedColumns);
    expect(await page.locator('.topics-quick a').count()===3,'real quick links missing');
    const hrefs=await page.locator('.topics-hub-link').evaluateAll(els=>els.map(x=>new URL(x.href).pathname));
    expect(new Set(hrefs).size===7,'lifestyle categories must not send multiple topics to one list');
    const tool=await page.locator('.topics-hub-link--calculator').evaluate(el=>({
      background:getComputedStyle(el).backgroundColor,width:el.getBoundingClientRect().width
    }));
    expect(tool.background==='rgb(32, 44, 55)','calculator entry must be visually differentiated');
    if(viewport.width>=390){
      const listWidth=await page.locator('.topics-hub-list').evaluate(el=>el.getBoundingClientRect().width);
      expect(Math.abs(tool.width-listWidth)<2,'calculator entry should occupy its own full row');
    }
   }
   if(route.slug==='finance'){
    expect(await page.locator('.finance-index-tile').count()===6,'finance destinations changed');
    expect(await page.locator('.finance-index-services .finance-index-tile').count()===3,'financial source links missing');
    expect(await page.locator('.finance-index-tools .finance-index-tile').count()===3,'calculator links missing');
    expect(await page.locator('.finance-index-symbol').count()===6,'finance services should be visually identifiable');
    const hero=await page.locator('.finance-index-hero').evaluate(el=>{
      const st=getComputedStyle(el),box=el.getBoundingClientRect();
      return {height:box.height,background:st.backgroundColor,alignment:st.textAlign,title:el.querySelector('h1')?.textContent};
    });
    expect(hero.title==='금융정보','finance page heading changed');
    expect(hero.background==='rgba(0, 0, 0, 0)'&&hero.alignment==='left',
      'finance intro should be an unboxed readable heading');
    expect(hero.height<(viewport.width>700?145:120),
      'finance intro is taller than its content requires: '+hero.height);
    const display=await page.locator('.finance-index-services').evaluate(el=>getComputedStyle(el).display);
    expect(display==='grid','finance service grid should not revert to a text-only column');
    const featured=page.locator('.finance-index-services>.finance-index-tile').first();
    const featuredHref=await featured.getAttribute('href');
    const targetUrl=new URL(featuredHref,page.url());
    const expectedPaths=liveBase?['/life/finance/savings/','/finance/savings/']:['/finance/savings/'];
    expect(targetUrl.origin===new URL(page.url()).origin&&expectedPaths.includes(targetUrl.pathname),
      'featured savings destination broken: '+featuredHref);
    const first=await featured.evaluate(el=>{
      const st=getComputedStyle(el),box=el.getBoundingClientRect(),title=el.querySelector('strong');
      return {top:box.top,height:box.height,background:st.backgroundColor,
        titleSize:parseFloat(getComputedStyle(title).fontSize),color:getComputedStyle(title).color};
    });
    expect(first.top<viewport.height-85,'first useful finance action is below viewport');
    expect(first.height>=(viewport.width>700?160:135),'featured action tap target too short');
    expect(first.background==='rgb(32, 44, 55)','featured finance service lost its strong contrast');
    expect(first.titleSize>=(viewport.width>700?27:21),'primary financial action title too small');
    expect(first.color==='rgb(255, 255, 255)','featured title lacks white contrast');
    expect(await page.locator('#finance-index-checks summary').count()===1,
      'finance safety caveats must remain accessible through native details');
   }
   if(route.slug==='food')
    expect(await page.locator('.food-card').first().evaluate(e=>getComputedStyle(e).borderTopStyle)!=='none','food cards missing defined boundary');
   if(route.slug==='real-estate')
    expect(await page.locator('.re-card').count()===3,'real-estate samples unexpectedly changed');
   verified++;
  }
  await page.close();
 }
 console.log('[menu-visual] PASS '+verified+' '+(liveBase?'deployed production':'local build')+
   ' desktop/mobile screens; hierarchy, network assets, navigation, no horizontal overflow and screenshots');
}finally{
 await browser.close();
 if(server)await new Promise(done=>server.close(done));
}
