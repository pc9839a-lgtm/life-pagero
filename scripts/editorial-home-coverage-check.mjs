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
// Task-first comparison paths must add practical decisions, not replace
// any of the 45 published original guides.
const expectedPaths = {
  inspection: ['car/car-inspection-period','car/car-inspection-reservation','car/car-inspection-late-penalty'],
  transfer: ['car/used-car-transfer-documents','car/used-car-transfer-cost','car/used-car-online-transfer'],
  parenting: ['support/child-allowance-2026','support/parental-benefit-2026'],
  livelihood: ['support/basic-pension-2026','support/livelihood-benefit-2026'],
};
assert(home.includes('id="life-pathways-title"'),'Missing situation-first decision navigation');
assert(css.includes('.life-path-grid') && css.includes('@media(max-width:690px)'),'Responsive decision cards missing');
assert(!home.includes('자격 확정') && !home.includes('지원금 지급 보장'),'Must not promise eligibility or benefits');
for(const [name, paths] of Object.entries(expectedPaths)){
  assert(home.includes('data-path="'+name+'"'),`Missing curated pathway: ${name}`);
  const match=home.match(new RegExp('<article class="life-path-card" data-path="'+name+'">([\\s\\S]*?)<\\/article>'));
  assert(match,`Missing pathway content: ${name}`);
  const anchors=[...match[1].matchAll(/<a href="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(anchors,paths.map(x=>'/'+x+'/'),`Wrong reading order for pathway: ${name}`);
  for(const target of paths){
    const post=posts.find(p=>p.category+'/'+p.slug===target);
    assert(post,`Dead pathway content target: ${target}`);
    assert(match[1].includes('공식자료 확인'),`Source review label missing: ${target}`);
  }
}

console.log(`PASS: All ${posts.length} published LIFE guides linked directly from editorial homepage, source dates and stylesheet present`);
