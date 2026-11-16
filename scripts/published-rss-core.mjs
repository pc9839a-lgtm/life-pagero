// RSS 2.0 for already published and indexable editorial articles only.
// Keep published dates distinct from meaningful content updates.
export const SITE = 'https://pagero.kr/life';
export const FEED_URL = SITE + '/rss.xml';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function xmlEscape(value) {
  const source = String(value ?? '');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(source))
    throw new Error('[rss] Invalid XML control character');
  return source.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&apos;',
  })[char]);
}

export function isoDate(value, subject) {
  if (!ISO_DATE.test(String(value || ''))) throw new Error('[rss] Missing ISO date for '+subject);
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value)
    throw new Error('[rss] Invalid calendar date '+value+' for '+subject);
  return value;
}

function publishedItem({path,title,description,publishedAt,updatedAt,category}) {
  if (!/^\/(?:[a-z0-9-]+\/)+$/.test(path))
    throw new Error('[rss] Unsafe article path '+path);
  if (!String(title || '').trim() || !String(description || '').trim())
    throw new Error('[rss] Missing editorial title or summary '+path);
  const published = isoDate(publishedAt, path+' publishedAt');
  const updated = isoDate(updatedAt || publishedAt, path+' updatedAt');
  if (updated < published)
    throw new Error('[rss] Updated before published '+path);
  return {url:SITE+path,path,title,description,publishedAt:published,updatedAt:updated,category};
}

export function collectPublishedFeedItems(posts, foodDataset) {
  if (!Array.isArray(posts) || !Array.isArray(foodDataset?.guides))
    throw new Error('[rss] Missing article or food archive');
  const records=[];
  for (const post of posts) {
    if (post.noindex) continue;
    if (!['car','support'].includes(post.category)) throw new Error('[rss] Unpublished category');
    records.push(publishedItem({
      path:'/'+post.category+'/'+post.slug+'/',
      title:post.title,description:post.description,
      publishedAt:post.publishedAt,updatedAt:post.updatedAt || post.publishedAt,
      category:post.category==='car'?'자동차':'정부지원',
    }));
  }
  for (const guide of foodDataset.guides) {
    if (guide.noindex) continue;
    records.push(publishedItem({
      path:'/food/'+guide.slug+'/',title:guide.title,description:guide.description,
      publishedAt:guide.publishedAt || foodDataset.publishedAt,
      updatedAt:guide.updatedAt || guide.publishedAt || foodDataset.publishedAt,
      category:'먹거리',
    }));
  }
  const seen=new Set();
  for (const item of records) {
    if (seen.has(item.url)) throw new Error('[rss] Duplicate feed URL '+item.url);
    seen.add(item.url);
  }
  return records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)
    || a.path.localeCompare(b.path,'en'));
}

export function renderRss(items) {
  if (!Array.isArray(items) || !items.length)
    throw new Error('[rss] Cannot publish an empty feed');
  const header='<?xml version="1.0" encoding="UTF-8"?>\n'
    +'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"'
    +' xmlns:dcterms="http://purl.org/dc/terms/">\n'
    +'<channel>\n'
    +'<title>생활비서</title>\n'
    +'<link>'+SITE+'/</link>\n'
    +'<description>자동차·정부지원·먹거리 생활정보의 발행 및 실질 수정 내역</description>\n'
    +'<language>ko-KR</language>\n'
    +'<atom:link href="'+FEED_URL+'" rel="self" type="application/rss+xml"/>\n';
  const body=items.map(item=>{
    const updated=new Date(item.updatedAt+'T00:00:00+09:00').toUTCString();
    return '<item>\n'
      +'<title>'+xmlEscape(item.title)+'</title>\n'
      +'<link>'+xmlEscape(item.url)+'</link>\n'
      +'<guid isPermaLink="true">'+xmlEscape(item.url)+'</guid>\n'
      +'<description>'+xmlEscape(item.description)+'</description>\n'
      +'<category>'+xmlEscape(item.category)+'</category>\n'
      +'<pubDate>'+updated+'</pubDate>\n'
      +'<dcterms:issued>'+item.publishedAt+'</dcterms:issued>\n'
      +'<dcterms:modified>'+item.updatedAt+'</dcterms:modified>\n'
      +'</item>';
  }).join('\n');
  return header+body+'\n</channel>\n</rss>\n';
}
