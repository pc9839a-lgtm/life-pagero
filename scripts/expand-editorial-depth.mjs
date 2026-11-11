import fs from 'node:fs';
import path from 'node:path';
import {publishedGuideCount,requiredScenarioCount} from './published-guide-count.mjs';

const CONTENT = path.resolve('content/posts');
const ROOT = path.resolve('content');
const FEATURE = '실제 상황에 적용해 보기';
const label = (caseTitle) => '### ' + FEATURE + ': ' + caseTitle;

const load = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
const cases = { ...load('editorial-expansions-car.json'), ...load('editorial-expansions-support.json') };
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
  const full=path.join(dir,ent.name);
  return ent.isDirectory()?walk(full):[full];
});
const files=walk(CONTENT).filter(x=>x.endsWith('.json'));
const seen=new Set();
let touched=0, inserted=0, short=0;
for(const file of files) {
  const post=JSON.parse(fs.readFileSync(file,'utf8'));
  if(post.noindex) continue;
  const entries=cases[post.slug];
  if(!Array.isArray(entries)||entries.length!==3) throw Error('Editorial expansion missing three distinct cases for '+post.slug);
  if(seen.has(post.slug)) throw Error('Duplicate slug in source: '+post.slug);
  seen.add(post.slug);
  const titles=new Set();
  for(const item of entries) {
    if(!Array.isArray(item)||item.length!==2||item[0].length<8||item[1].length<100) {
      throw Error('Editorial expansion too short: '+post.slug);
    }
    if(titles.has(item[0]))throw Error('Duplicate case title in '+post.slug);
    titles.add(item[0]);
  }

  let changed=false;
  if(Array.isArray(post.series?.parts)&&post.series.parts.length===3) {
    for(const [i,part] of post.series.parts.entries()) {
      const [heading, paragraph]=entries[i];
      const title=label(heading);
      if(!part.body.includes(title)){
        part.body = part.body.trimEnd() + '\n\n' + title + '\n\n' + paragraph + '\n';
        changed=true;inserted++;
      }
    }
    // Preserve the independently reviewed source-body paragraphs, including
    // deadline corrections that may not appear verbatim in the series parts.
    for(const [heading,paragraph] of entries) {
      const title=label(heading);
      if(!post.body.includes(title)) {
        post.body=post.body.trimEnd()+'\n\n'+title+'\n\n'+paragraph+'\n';
        changed=true;
      }
    }
  } else {
    // Older single-page guides do not have the three-part series field.
    for(const [heading,paragraph] of entries) {
      const title=label(heading);
      if(!post.body.includes(title)){
        post.body=post.body.trimEnd()+'\n\n'+title+'\n\n'+paragraph+'\n';
        changed=true;inserted++;
      }
    }
  }
  if(changed){fs.writeFileSync(file,JSON.stringify(post,null,2)+'\n');touched++;}
  if(post.body.length<5000)short++;
}
const unexpected=Object.keys(cases).filter(k=>!seen.has(k));
if(unexpected.length)console.log('[editorial-depth] Source-only or superseded entries not in published build: '+unexpected.join(','));
if(seen.size!==publishedGuideCount)throw Error('Expected '+publishedGuideCount+' published guides, found '+seen.size);
console.log('[editorial-depth] Prepared '+seen.size+' published guides, '+inserted+' unique situation notes across '+touched+' changed files; '+short+' full source bodies remain below 5,000 characters.');
