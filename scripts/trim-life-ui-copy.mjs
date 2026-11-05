import fs from 'node:fs';
import path from 'node:path';

// Final output edit, not CSS hiding: remove verbose narration and artificial
// explanatory subheadings while preserving the actual data tools, source links,
// advertising disclosures, article bodies and SEO metadata.
const DIST=path.resolve('dist');
const read=name=>fs.readFileSync(path.join(DIST,name),'utf8');
const write=(name,html)=>fs.writeFileSync(path.join(DIST,name),html);
const finance=[
  'finance/index.html','finance/savings/index.html',
  'finance/markets/index.html','finance/loan-payment/index.html'
];
let deleted=0;
for(const filename of [...finance,'today/index.html']){
  let html=read(filename);
  const before=html;
  const remove=(pattern)=>{html=html.replace(pattern,()=>{deleted++;return '';});};

  // Remove every lead-in paragraph that repeats the H1 and menus.
  remove(/<p class="finance-page-intro">[\s\S]*?<\/p>/g);
  remove(/<p class="today-page-intro">[\s\S]*?<\/p>/g);
  remove(/<p class="today-news-intro">[\s\S]*?<\/p>/g);

  // Long "what to know", "why" and "how it works" sections are not interface
  // content. Their underlying financial product table, original-source links,
  // calculator inputs and primary result/schedule all remain intact.
  remove(/<section class="finance-plain-guide">[\s\S]*?<\/section>/g);
  remove(/<p class="today-stock-notice">[\s\S]*?<\/p>/g);
  remove(/<div class="loan-input-note">[\s\S]*?<\/div>/g);

  // A tool card needs only a name and working destination, not a second
  // templated sentence beneath every title.
  html=html.replace(/(<a class="finance-hub-card"[^>]*><strong>[\s\S]*?<\/strong>)<span>[\s\S]*?<\/span>(<\/a>)/g,
    (_all,head,tail)=>{deleted++;return head+tail;});

  // Keep functional field names and table headings; remove only pseudo-intros.
  html=html.replace(/(<section class="loan-result-details"><h2>상환방식별 비교<\/h2>)<p>[\s\S]*?<\/p>/g,
    (_all,head)=>{deleted++;return head;});
  html=html.replace(/(<div class="finance-section-title"><div><h2[^>]*>[\s\S]*?<\/h2>)<p>[\s\S]*?<\/p>/g,
    (_all,head)=>{deleted++;return head;});

  // Keep only source navigation, not the verbose "how data is updated" essay.
  html=html.replace(/<section class="today-source-guidance">[\s\S]*?<div class="today-source-links">([\s\S]*?)<\/div><\/section>/g,
    (_all,links)=>{
      deleted++;
      return '<nav aria-label="자료 출처" class="today-source-links">'+links+'</nav>';
    });

  if(html!==before)write(filename,html);
}

// Existing article facts already have no editorial H2/H3, but the compact
// wrapper re-added a pseudo-heading above every 1-sentence answer.
let articles=0;
for(const category of ['car','support']){
  for(const ent of fs.readdirSync(path.join(DIST,category),{withFileTypes:true})){
    if(!ent.isDirectory())continue;
    const filename=category+'/'+ent.name+'/index.html';
    if(!fs.existsSync(path.join(DIST,filename)))continue;
    let html=read(filename);
    if(!html.includes('class="compact-answer"'))continue;
    const before=html;
    html=html.replace(/<span class="compact-answer-label">핵심 내용<\/span>/g,'');
    html=html.replace(/전체 설명 읽기/g,'본문 보기')
      .replace(/상세 내용 펼쳐보기/g,'본문')
      .replace(/핵심 정보 더보기/g,'더보기');
    if(html!==before)write(filename,html);
    articles++;
  }
}
console.log('[concise] Trimmed '+deleted+' explanatory UI elements and '+articles+' article pseudo-labels without changing articles or SEO.');
