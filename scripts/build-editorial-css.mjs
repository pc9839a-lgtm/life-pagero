import fs from 'node:fs';
import path from 'node:path';

// Authoritative source of the public editorial stylesheet.
// Keep this order: media queries and late page-specific refinements depend on it.
// The browser still receives exactly ONE life-editorial-20261106.css.
export const editorialModules=[
  '00-foundation.css',
  '10-home.css',
  '20-category.css',
  '30-article.css',
  '40-finance.css',
  '50-today.css',
  '60-responsive.css',
  '70-calculators.css',
  '80-food-guides.css'
];
const sourceDir=path.resolve('assets/styles/editorial');
const outputFile=path.resolve('dist/life-editorial-20261106.css');
const pieces=editorialModules.map(filename=>{
  const content=fs.readFileSync(path.join(sourceDir,filename),'utf8');
  if(!content.trim())throw Error('[css] Empty module '+filename);
  if(!content.endsWith('\n'))throw Error('[css] Source module must end with a newline: '+filename);
  return content;
});
const compiled=pieces.join('');
if(!compiled.startsWith('@import url('))throw Error('[css] Foundation font import missing');
// The modules are complete CSS at-rule boundaries. Each must have balanced
// braces (ignore string contents and comments, including CSS text content).
function balanced(content,label){
  let depth=0,quote='',comment=false,escaped=false;
  for(let i=0;i<content.length;i++){
    const ch=content[i],next=content[i+1];
    if(comment){if(ch==='*'&&next==='/'){comment=false;i++;}continue;}
    if(quote){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(ch===quote)quote='';
      continue;
    }
    if(ch==='/'&&next==='*'){comment=true;i++;continue;}
    if(ch==='"'||ch==="'"){quote=ch;continue;}
    if(ch==='{')depth++;
    if(ch==='}')depth--;
    if(depth<0)throw Error('[css] Unexpected closing brace in '+label);
  }
  if(depth||comment||quote)throw Error('[css] Unbalanced source module '+label);
}
pieces.forEach((piece,index)=>balanced(piece,editorialModules[index]));
fs.mkdirSync(path.dirname(outputFile),{recursive:true});
fs.writeFileSync(outputFile,compiled,'utf8');

// Transitional styles are used by intermediate build-time UI checks.
// They never ship: finish-css-assets.mjs deletes them after the final pass.
const legacyDir=path.resolve('assets/styles/legacy');
const legacyFiles=[
  'life-modern.css','life-compact.css',
  'life-global-nav.css','today-dashboard.css'
];
for(const name of legacyFiles){
  const sourceFile=path.join(legacyDir,name);
  if(!fs.existsSync(sourceFile))throw Error('[css] Missing legacy build-only stylesheet '+name);
  fs.copyFileSync(sourceFile,path.join(path.dirname(outputFile),name));
}
console.log('[css] Built '+editorialModules.length+' ordered modules → one editorial CSS ('+Buffer.byteLength(compiled)+' bytes; '+legacyFiles.length+' temporary build-only CSS assets)');
