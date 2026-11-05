import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const NOT_USED = /(?:정리합니다|안내합니다|확인하세요|참고하세요|살펴보세요|알아보겠습니다|함께 알아보겠습니다|직접 연결했습니다|읽어보세요)/;
const META = /(?:총\s*\d+개\s*가이드|공식\s*출처와\s*확인일을\s*함께\s*표시|공식자료\s*확인일과\s*출처를\s*공개|추천 글 외에 발행된 가이드|아래 표는 선택할 글|본 안내는|이 글에서는|이번 글에서는|지금부터|함께 살펴보|이 페이지에서는)/;

const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const f=path.join(dir,e.name);return e.isDirectory()?walk(f):[f];
});
const visibleText = html => html.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|amp);/g,' ').replace(/\s+/g,' ').trim();

// Mark characters belonging to generic sentences, while leaving HTML tags
// and factual neighboring sentences intact. Never reparse links or attributes.
function removeGenericSentences(inner){
  const plain=visibleText(inner);
  if(!NOT_USED.test(plain) && !META.test(plain))return inner;

  // Date, amount, table-reference and multi-sentence paragraphs carry the
  // actual article facts. Do not remove those sentences wholesale.
  if(plain.length >= 140 || /[0-9][0-9.,~%\/\-]*/.test(plain) || /<a\b|<strong\b|<code\b/i.test(inner)){
    return inner
      .replace(/확인하세요/g,'확인해야 합니다')
      .replace(/참고하세요/g,'참고할 수 있습니다')
      .replace(/살펴보세요/g,'살펴볼 수 있습니다');
  }

  // Only standalone boilerplate paragraphs, never a factual paragraph.
  if(META.test(plain) || (NOT_USED.test(plain) && plain.length<75))return '';
  return inner
    .replace(/확인하세요/g,'확인해야 합니다')
    .replace(/참고하세요/g,'참고할 수 있습니다')
    .replace(/살펴보세요/g,'살펴볼 수 있습니다');
}

let changed=0;
let deletedParagraphs=0;
for(const file of walk(DIST).filter(f=>f.endsWith('.html'))){
  let html=fs.readFileSync(file,'utf8');
  const original=html;
  // Remove global publisher/developer style banners. Keep legal notices where
  // required and preserve the Article, FAQ, citation, and advertisement markup.
  html=html.replace(/<div class="top-strip"><div class="top-strip-inner">[\s\S]*?<\/div><\/div>/g,'');
  html=html.replace(/<p class="life-archive-kicker">[\s\S]*?<\/p>/g,'');
  html=html.replace(/<p class="series-part-description">[\s\S]*?<\/p>/g,'');
  html=html.replace(/<p class="article-dek">[\s\S]*?<\/p>/g,'');
  html=html.replace(/<p class="life-archive-note">[\s\S]*?<\/p>/g,'');
  html=html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi,(full,attrs,inner)=>{
    if(/life-coupang|life-sponsor|disclaimer/i.test(attrs))return full;
    const plain=visibleText(inner);
    if(/(?:총\s*\d+개\s*가이드|공식자료 확인일과 출처를 공개|공식 출처와 확인일을 함께 표시|독립 생활정보 사이트 · 정부기관 아님)/.test(plain)){
      deletedParagraphs++;return '';
    }
    const updated=removeGenericSentences(inner);
    if(!visibleText(updated)){deletedParagraphs++;return '';}
    return '<p'+attrs+'>'+updated+'</p>';
  });
  // A standalone bold-only line is another generated pseudo-heading.
  html=html.replace(/<p>\s*<(?:strong|b)>[^<]{1,110}<\/(?:strong|b)>\s*<\/p>/gi,'');
  if(html!==original){fs.writeFileSync(file,html);changed++;}
}
console.log('[copy] Removed repetitive editorial narration from '+changed+' HTML page(s); '+deletedParagraphs+' empty/boilerplate paragraphs.');
const residual=[];
for(const file of walk(DIST).filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(file,'utf8');
  const body=(html.split('<body>')[1] || '').replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/g,'')
    .replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/g,'').replace(/<[^>]+>/g,' ');
  const matches=[...body.matchAll(/(?:정리합니다|안내합니다|확인하세요|참고하세요|살펴보세요)/g)].length;
  if(matches)residual.push({path:path.relative(DIST,file),matches});
}
console.log('[copy] Remaining narrative endings in visible body:',residual.reduce((n,x)=>n+x.matches,0));
console.log('[copy] First pages with narrative endings:',JSON.stringify(residual.slice(0,12)));

