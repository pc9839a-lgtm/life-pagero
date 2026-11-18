import fs from 'node:fs';
import path from 'node:path';

// Final build gate: every Google-indexable sitemap URL must have a meaningful,
// unique search snippet. Checking only article JSON misses dynamic/category pages.
const SITE='https://pagero.kr/life';
const DIST=path.resolve('dist');
const sitemap=fs.readFileSync(path.join(DIST,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
  .map(match=>match[1].trim().replaceAll('&amp;','&'));
const seenTitles=new Map(),seenDescriptions=new Map();
const issues=[];
const decode=value=>String(value).replace(/&(?:amp|quot|lt|gt|#39|apos);/g,entity=>
  ({'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&#39;':"'",'&apos;':"'"})[entity]);
function meta(html,name){
  const matches=[...html.matchAll(new RegExp('<meta\\b(?=[^>]*\\bname\\s*=\\s*["\\\']'+name+'["\\\'])[^>]*>','gi'))];
  const value=matches[0]?.[0].match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]||'';
  return {count:matches.length,value:decode(value).trim()};
}
if(urls.length<75 || new Set(urls).size!==urls.length)
  throw Error('[seo-snippets] Missing or duplicate sitemap URLs');
for(const url of urls){
  if(!url.startsWith(SITE+'/')){issues.push(url+': noncanonical sitemap URL');continue}
  const route=url.slice(SITE.length);
  const file=path.join(DIST,route==='/'?'index.html':route.slice(1)+'index.html');
  if(!fs.existsSync(file)){issues.push(url+': no HTML file');continue}
  const html=fs.readFileSync(file,'utf8');
  const titles=[...html.matchAll(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/gi)];
  const title=decode(titles[0]?.[1]||'').replace(/<[^>]*>/g,'').trim();
  const desc=meta(html,'description');
  if(titles.length!==1||title.length<5)issues.push(route+': missing/duplicate/short title');
  if(desc.count!==1||desc.value.length<20)issues.push(route+': missing/duplicate/short description');
  const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
  if(canonical!==url)issues.push(route+': incorrect canonical');
  if(/\bnoindex\b/i.test(meta(html,'robots').value))issues.push(route+': noindex in published sitemap');
  if(seenTitles.has(title))issues.push(route+': duplicate title with '+seenTitles.get(title));
  else seenTitles.set(title,route);
  if(seenDescriptions.has(desc.value))issues.push(route+': duplicate description with '+seenDescriptions.get(desc.value));
  else seenDescriptions.set(desc.value,route);
}
console.log('[seo-snippets] canonicalPages='+urls.length+' uniqueTitles='+seenTitles.size+
  ' uniqueDescriptions='+seenDescriptions.size+' problems='+issues.length);
for(const issue of issues)console.error('[seo-snippets] FAIL '+issue);
if(issues.length)process.exitCode=1;
