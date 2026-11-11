import fs from 'node:fs';
import path from 'node:path';

// Derive published-guide QA expectations from the hydrated source tree.
// Every future publication must add three distinct editorial situations, but
// publishing a 47th or 48th guide must not require patching eight fixed counts.
const root=path.resolve('content/posts');
const files=fs.readdirSync(root,{recursive:true}).filter(file=>file.endsWith('.json'));
const items=files.map(file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8')));
const slugs=items.filter(item=>item.noindex!==true).map(item=>item.slug);
if(new Set(slugs).size!==slugs.length)throw Error('[guides] Duplicate published slug');
export const publishedGuideCount=slugs.length;
export const requiredScenarioCount=publishedGuideCount*3;
