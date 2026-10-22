import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root='content/posts';
function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
    const file=path.join(dir,item.name);
    return item.isDirectory()?walk(file):[file];
  });
}
const posts=walk(root).filter(x=>x.endsWith('.json')).map(file=>JSON.parse(fs.readFileSync(file,'utf8'))).filter(p=>!p.noindex);
const home=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/life-editorial-20261022.css','utf8');

assert.equal(posts.length,45,'Unexpected article count: review new published content');
assert(home.includes('href="/life-editorial-20261022.css"'),'Missing versioned stylesheet');
assert(home.includes('LIFE EDITORIAL ARCHIVE'),'Archive heading is missing');
assert(home.includes('href="/editorial-standards/"'),'Editorial policies not linked');
assert(css.includes('.life-archive-grid') && css.includes('@media(max-width:690px)'),'Mobile archive CSS missing');

for(const post of posts){
  const url=`/${post.category}/${post.slug}/`;
  assert(home.includes(`href="${url}"`),`Article missing from main hub: ${url}`);
  assert(fs.existsSync(path.join('dist',url,'index.html')),`Article HTML missing: ${url}`);
}
assert(home.includes('공식자료 확인'),'Missing source review dates');
console.log(`PASS: All ${posts.length} published LIFE guides linked directly from editorial homepage, source dates and stylesheet present`);
