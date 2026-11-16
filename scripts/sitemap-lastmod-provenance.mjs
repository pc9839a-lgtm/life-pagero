// Single source of truth for date provenance in the final XML sitemap.
// Only a page's own editorial record, index contents, or visibly dated policy
// may establish lastmod. Static utilities without provenance omit the tag.
const ISO_DAY=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const fail=value=>{throw Error('[sitemap-lastmod] '+value)};
function day(value,reason){
  if (!ISO_DAY.test(String(value||'')) ||
      Number.isNaN(new Date(value+'T00:00:00Z').valueOf()) ||
      new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)
    fail('Invalid source date for '+reason+': '+String(value));
  return value;
}
export function dateMapForSitemap(posts,foodGuides,standardsHtml) {
  if (!Array.isArray(posts)||posts.length<40) fail('Missing published post archive');
  if (!Array.isArray(foodGuides?.guides)||foodGuides.guides.length<10)
    fail('Missing food guide archive');
  const dates=new Map();
  const groups={car:[],support:[]};
  const add=(route,date,origin)=>{
    if(dates.has(route))fail('Duplicate article route '+route);
    dates.set(route,day(date,origin));
  };
  for(const post of posts){
    if(post.noindex)continue;
    if(!['car','support'].includes(post.category)||!post.slug)
      fail('Unexpected published post category/slug');
    const updated=day(post.updatedAt||post.reviewedAt||post.publishedAt,post.slug);
    add('/'+post.category+'/'+post.slug+'/',updated,post.slug);
    groups[post.category].push(updated);
  }
  for(const category of Object.keys(groups)){
    if(!groups[category].length)fail('Empty '+category+' editorial group');
    dates.set('/'+category+'/',groups[category].sort().at(-1));
  }
  for(const guide of foodGuides.guides){
    if(!guide.slug)fail('Food guide slug missing');
    add('/food/'+guide.slug+'/',
      guide.updatedAt||guide.publishedAt||foodGuides.publishedAt,
      'food/'+guide.slug);
  }
  const policyDate=String(standardsHtml||'').match(/작성·검수 기준 확인일:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)?.[1];
  if(!policyDate)fail('Editorial policy page missing its visible review date');
  dates.set('/editorial-standards/',day(policyDate,'editorial policy'));
  return dates;
}

export function updateSitemapDates(xml,dates,base='https://pagero.kr/life'){
  if(!xml.includes('<urlset '))fail('Missing XML urlset');
  const seen=new Set();
  let removed=0,retained=0,count=0;
  const result=xml.replace(/<url>[\s\S]*?<\/url>/g,block=>{
    const raw=block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1]?.trim();
    if(!raw)fail('Missing sitemap URL');
    const absolute=raw.replaceAll('&amp;','&');
    if(!absolute.startsWith(base+'/'))fail('Unexpected sitemap origin '+absolute);
    const route=absolute.slice(base.length);
    if(seen.has(route))fail('Duplicate sitemap URL '+route);
    seen.add(route);count++;
    const date=dates.get(route)||null;
    const old=[...block.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(match=>match[1]);
    if(date)retained++;
    else if(old.length)removed+=old.length;
    const cleaned=block.replace(/<lastmod>[\s\S]*?<\/lastmod>/g,'');
    return cleaned.replace('</loc>','</loc>'+(date?'<lastmod>'+date+'</lastmod>':''));
  });
  if(count<60)fail('Too few sitemap URLs: '+count);
  for(const route of dates.keys())
    if(!seen.has(route))fail('Provenance-backed article missing from sitemap: '+route);
  return {xml:result,summary:{total:count,dated:retained,undated:count-retained,removed}};
}
