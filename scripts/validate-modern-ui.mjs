import fs from 'node:fs';
import path from 'node:path';
const DIST=path.resolve('dist');
const read=relative=>fs.readFileSync(path.join(DIST,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw Error('[modern-qa] '+message)};
const home=read('index.html');
const style=read('life-modern.css');
const script=read('life-modern.js');
assert(style.length>15000&&style.includes('@media(max-width:700px)'),'responsive stylesheet missing');
assert(script.includes('filter.addEventListener("input", update)'),'category keyboard filter missing');
assert(home.includes('class="life-modern life-modern-home"'),'homepage redesign not applied');
assert(home.includes('role="search"')&&home.includes('portal-home-q'),'working homepage search missing');
assert((home.match(/class="modern-topic-icon"/g)||[]).length===6,'six topic icons required');
assert(home.includes('class="modern-all-articles"'),'archive must be collapsible, not lost');
assert(home.includes('class="modern-section-heading"'),'situation-based exploration missing');
assert(home.includes('href="/car/"')&&home.includes('href="/support/"')&&home.includes('href="/finance/"'),'core destinations missing');
assert((home.match(/data-affiliate="tenping-/g)||[]).length===4,'homepage affiliate cards were changed or deleted');
assert((home.match(/data-life-coupang-kind="(?:middle|body)"/g)||[]).length===2,'homepage body ads changed');
assert((home.match(/data-life-coupang-kind="rail"/g)||[]).length===1,'homepage rail ad changed');
assert(home.indexOf('class="modern-sponsored-area"')>home.indexOf('class="modern-all-articles"'),'ads must follow primary information on home');
assert(!home.includes('class="portal-home-section portal-updates"'),'duplicated latest listing retained');
let cardCount=0;
for(const category of ['car','support']){
  const html=read(category+'/index.html');
  assert(html.includes('class="life-modern life-modern-category"'),'category redesign missing: '+category);
  assert(html.includes('id="modern-list-filter"')&&html.includes('id="modern-article-list"'),'searchable category missing: '+category);
  assert(html.includes('id="modern-list-empty"'),'empty-search state missing: '+category);
  assert(html.includes('class="modern-sponsored-area"'),'sponsored disclosure below content missing: '+category);
  const posts=(html.match(/<article class="post-card">/g)||[]).length;
  assert(posts>2,'category cards missing: '+category);
  assert(html.indexOf('class="modern-sponsored-area"')>html.indexOf('id="modern-article-list"'),'category ads placed before articles: '+category);
  cardCount+=posts;
}
assert(cardCount===46,'published category article count changed: '+cardCount);
const posts=['car','support'].flatMap(category=>fs.readdirSync(path.join(DIST,category),{withFileTypes:true})
  .filter(entry=>entry.isDirectory()&&fs.existsSync(path.join(DIST,category,entry.name,'index.html')))
  .map(entry=>category+'/'+entry.name+'/index.html'));
assert(posts.length===46,'expected all 46 editorial pages, got '+posts.length);
for(const file of posts){
  const html=read(file);
  assert(html.includes('class="life-modern life-modern-article"'),'article visual redesign missing: '+file);
  assert(html.includes('class="compact-answer"') && html.includes('class="compact-full-guide"'),'compact summary/full guide unavailable: '+file);
  const article=html.match(/<div class="article-content">([\s\S]*?)<div class="disclaimer">/)?.[1]||'';
  assert(article.length>1800,'editorial content removed: '+file);
  assert(!/<h[234](?:\s[^>]*)?>/.test(article),'user-removed article subheading was restored: '+file);
  assert(html.includes('href="/life-modern.css"'),'design styles missing: '+file);
  assert((html.match(/<link rel="canonical"/g)||[]).length===1,'SEO canonical changed: '+file);
}
let pages=0;
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>ent.isDirectory()?walk(path.join(dir,ent.name)):[path.join(dir,ent.name)]);
for(const file of walk(DIST).filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(file,'utf8');
  if(!html.includes('class="life-modern '))continue;
  assert((html.match(/href="\/life-modern\.css"/g)||[]).length===1,'stylesheet injected more than once: '+file);
  assert((html.match(/<script src="\/life-modern\.js" defer><\/script>/g)||[]).length===1,'enhancement script missing: '+file);
  pages++;
}
assert(pages>=140,'sitewide modern theme coverage incomplete: '+pages);
console.log('[modern-qa] '+pages+' pages, six categories, '+cardCount+' linked article cards, 46 untouched editorial bodies, mobile CSS, working search/filters, canonical and affiliate integrity verified.');
