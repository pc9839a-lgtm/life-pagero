import fs from 'node:fs';
import path from 'node:path';

// Last build phase, after all intermediate UI validations.
// The legacy CSS files are needed only by the old transitional build scripts.
// They must not be published to the browser as unused deployment artifacts.
const dist=path.resolve('dist');
const sources=path.resolve('assets/styles/editorial');
const ordered=[
 '00-foundation.css','10-home.css','20-category.css','30-article.css',
 '40-finance.css','50-today.css','60-responsive.css',
 '70-calculators.css','80-food-guides.css'
];
const compiled=fs.readFileSync(path.join(dist,'life-editorial-20261106.css'),'utf8');
const original=ordered.map(x=>fs.readFileSync(path.join(sources,x),'utf8')).join('');
if(compiled!==original)throw Error('[css-finish] Compiled CSS differs from source files');

const pages=[];
const visit=directory=>{
 for(const d of fs.readdirSync(directory,{withFileTypes:true})){
   const file=path.join(directory,d.name);
   if(d.isDirectory())visit(file);
   else if(file.endsWith('.html'))pages.push(file);
 }
};
visit(dist);
if(pages.length<150)throw Error('[css-finish] Unusually few HTML pages: '+pages.length);
const html=pages.map(file=>fs.readFileSync(file,'utf8')).join('\n');
const legacy=[
 'life-modern.css','life-compact.css','life-global-nav.css',
 'today-dashboard.css','life-editorial-20261105.css'
];
for(const name of legacy){
 // Reject pruning if any page still requests the old asset.
 const linked=html.includes('href="/'+name+'"')||
   html.includes('href="/'+name+'?')||
   html.includes('src="/'+name+'"')||
   html.includes('src="/'+name+'?');
 if(linked)throw Error('[css-finish] Legacy stylesheet is still linked: '+name);
 const asset=path.join(dist,name);
 if(fs.existsSync(asset))fs.unlinkSync(asset);
}
if(!html.includes('href="/life-editorial-20261106.css?v='))
 throw Error('[css-finish] Final design CSS not linked');
console.log('[css-finish] Verified nine modular sources. Pruned '+legacy.length+
 ' unused intermediate CSS files from '+pages.length+' generated pages.');
