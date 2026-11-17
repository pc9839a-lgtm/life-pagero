// Pure local-link parser for pages emitted by the LIFE build. Crawl static
// HTML anchors, not JSON sitemap declarations or client-only navigation.
const SITE='https://pagero.kr/life';
const ORIGIN='https://life-pagero.pages.dev';

export function linkDestination(href, source='/') {
  if(typeof href!=='string')return null;
  let value=href.trim().replaceAll('&amp;','&').replaceAll('&#38;','&');
  if(!value||value.startsWith('#')||/^(?:javascript|mailto|tel|data):/i.test(value)
      ||value.startsWith('//'))return null;
  if(value==='/'||value==='/life'||value==='/life/')return '/';
  if(value.startsWith('/life/'))value=value.slice('/life'.length);
  if(value.startsWith(SITE+'/'))value=value.slice(SITE.length);
  if(value===SITE)value='/';
  let url;
  try{
    url=new URL(value,ORIGIN+source);
  }catch{return null;}
  if(url.origin!==ORIGIN)return null;
  let pathname=url.pathname.replace(/\/{2,}/g,'/');
  if(pathname==='/index.html')return '/';
  if(pathname.endsWith('/index.html'))pathname=pathname.slice(0,-'index.html'.length);
  if(!pathname.endsWith('/')&&!/\.[a-z0-9]+$/i.test(pathname))pathname+='/';
  if(pathname.includes('/../')||pathname.includes('/./'))return null;
  return pathname;
}

export function extractInternalLinks(html, source='/') {
  const links=new Set();
  for(const match of String(html).matchAll(/<a\b([^>]*?)>/gi)){
    const tag=match[1];
    if(/\brel\s*=\s*(?:"[^"]*\bnofollow\b[^"]*"|'[^']*\bnofollow\b[^']*')/i.test(tag))
      continue;
    const href=tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if(!href)continue;
    const target=linkDestination(href[1]??href[2],source);
    if(target)links.add(target);
  }
  return [...links];
}

export function discoverGraph(graph, home='/') {
  const paths=new Map([[home,[home]]]);
  const queue=[home];
  for(let i=0;i<queue.length;i++){
    const source=queue[i];
    for(const target of graph.get(source)||[]){
      if(paths.has(target)||!graph.has(target))continue;
      paths.set(target,[...paths.get(source),target]);
      queue.push(target);
    }
  }
  return paths;
}
