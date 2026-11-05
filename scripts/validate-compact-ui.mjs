import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(v,m)=>{if(!v)throw Error('[compact-qa] '+m)};
const home=read('index.html');
const count=(s,re)=>(s.match(re)||[]).length;
assert(home.includes('<h1>무엇을 찾고 계신가요?</h1>'),'single-action hero not present');
assert(home.includes('id="portal-home-q"')&&home.includes('role="search"'),'working search removed');
assert(count(home,/class="portal-topic-card compact-topic"/g)===6,'six minimal category buttons required');
assert(count(home,/class="compact-topic-link"/g)===6,'each category requires exactly one entry point');
assert(!home.includes('class="portal-topic-card-head"'),'dense per-category paragraphs remain');
const popular=home.match(/<section class="compact-popular"[\s\S]*?<\/section>/)?.[0]||'';
assert(count(popular,/<li><a href="/g)===3,'front screen must show exactly 3 popular article links');
assert(home.includes('<details class="compact-explore"><summary>상황별로 찾아보기</summary>'),'tasks must be initially collapsed');
assert(home.includes('<details class="compact-explore compact-latest">'),'latest list must be initially collapsed');
assert(home.includes('<details class="modern-all-articles">'),'full archive must be initially collapsed');
assert(home.includes('href="/finance/savings/"')&&home.includes('href="/finance/markets/"'),'finance functions lost');
assert(!home.includes('class="finance-home-shortcuts"'),'duplicate finance explanation tiles remain');
assert(count(home,/data-affiliate="tenping-/g)===4,'homepage affiliate placements altered');
assert(count(home,/data-life-coupang-kind="(?:middle|body)"/g)===2,'homepage advertising units altered');
assert(home.indexOf('class="modern-sponsored-area"')>home.indexOf('class="compact-popular"'),'advertising precedes core content');
let cards=0;
for(const category of ['car','support']){
 const html=read(category+'/index.html');
 assert(html.includes('class="compact-explore compact-category-links"'),'quick links must be collapsible: '+category);
 assert(html.includes('id="modern-list-filter"'),'filter missing: '+category);
 cards+=count(html,/<article class="post-card">/g);
}
assert(cards===46,'all 46 category articles must remain visible in listings: '+cards);
let guides=0;
for(const category of ['car','support']){
 const dir=path.join(root,category);
 for(const ent of fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory())){
   const file=category+'/'+ent.name+'/index.html';
   if(!fs.existsSync(path.join(root,file)))continue;
   const html=read(file);
   const wrapper=html.match(/<details id="compact-full-guide" class="compact-full-guide">[\s\S]*?<\/details><\/article>/)?.[0];
   assert(wrapper,'native disclosure does not contain the complete article: '+file);
   const original=html.match(/<div class="article-content">([\s\S]*?)<div class="disclaimer">/)?.[1]||'';
   assert(original.length>2000,'full editorial article disappeared: '+file);
   assert(count(html,/class="compact-answer-label"/g)===1,'one concise first answer required: '+file);
   assert(html.includes('data-compact-open="true"'),'one-click full reading not wired: '+file);
   assert(!/<h[234](?:\s[^>]*)?>/.test(original),'publisher-removed in-body headings returned: '+file);
   assert(count(html,/<link rel="canonical"/g)===1,'duplicate canonical on '+file);
   guides++;
 }
}
assert(guides===46,'expected 46 primary articles: '+guides);
assert(read('life-compact.css').includes('.compact-topic-link'),'new dense-free stylesheet not published');
assert(read('life-compact.js').includes('guide.open = true'),'full-guide open behavior missing');
const findFiles=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?findFiles(path.join(d,e.name)):[path.join(d,e.name)]);
let themed=0;
for(const f of findFiles(root).filter(x=>x.endsWith('.html'))){
 const html=fs.readFileSync(f,'utf8');
 if(!html.includes('class="life-modern '))continue;
 assert(count(html,/href="\/life-compact\.css"/g)===1,'missing or duplicate compact style: '+f);
 assert(count(html,/src="\/life-compact\.js"/g)===1,'missing or duplicate compact controller: '+f);
 themed++;
}
assert(themed>=140,'missing compact theme coverage: '+themed);
console.log('[compact-qa] '+themed+' responsive pages; 6 icon-only categories; 3 popular links; 46 searchable article links, 46 intact collapsed guides, ads and canonical links preserved.');
