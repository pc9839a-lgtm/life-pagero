import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('dist');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const must=(condition,message)=>{if(!condition)throw Error('[concise-qa] '+message);};
const all=[
  'finance/index.html','finance/savings/index.html',
  'finance/markets/index.html','finance/loan-payment/index.html',
  'today/index.html'
];
for(const filename of all){
  const html=get(filename);
  must((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length===1,filename+' missing H1');
  must((html.match(/<link rel="canonical"/g)||[]).length===1,filename+' canonical changed');
  must(html.includes('name="description"'),filename+' SEO description missing');
  must(!/class="(?:finance-page-intro|finance-plain-guide|today-page-intro|today-news-intro|today-source-guidance|loan-input-note|today-stock-notice)"/.test(html),
    filename+' has remaining narration section');
  must((html.match(/data-life-coupang-kind="body"/g)||[]).length===1,filename+' labelled sponsor lost');
  must(html.includes('data-life-coupang-banner="sitewide-v4"'),filename+' ad disclosure changed');
}
const finance=get('finance/index.html');
must((finance.match(/class="finance-hub-card"/g)||[]).length===6,'finance tools lost');
for(const href of ['/finance/savings/','/finance/markets/','/finance/loan-payment/',
  '/finance/savings-calculator/','/finance/mortgage-calculator/']){
  must(finance.includes('href="'+href+'"'),'finance navigation lost: '+href);
}
const savings=get('finance/savings/index.html');
must(savings.includes('id="finance-rate-panel"')&&savings.includes('id="finance-products"'),
  'bank rate comparison controls removed');
const loan=get('finance/loan-payment/index.html');
for(const id of ['portal-loan-form','loan-method-comparison','loan-schedule-table','loan-export']){
  must(loan.includes('id="'+id+'"'),'loan tool missing '+id);
}
must(loan.includes('상환방식별 비교')&&loan.includes('월별 상환표'),
  'functional table headings removed');
const today=get('today/index.html');
for(const item of ['data-today-news','data-today-crypto','data-today-weather','data-today-stocks']){
  must(today.includes(item),'today widget missing '+item);
}
must(today.includes('class="today-source-links"'),
  'today original source attribution links lost');
const home=get('index.html');
must((home.match(/class="portal-topic-card compact-topic"/g)||[]).length===6,
  'original 6 homepage topics changed');
must((home.match(/data-life-coupang-kind="(?:body|middle)"/g)||[]).length===2,
  'homepage advertising changed');
let articles=0;
for(const category of ['car','support']){
  const dir=path.join(root,category);
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(!ent.isDirectory())continue;
    const filename=path.join(category,ent.name,'index.html');
    if(!fs.existsSync(path.join(root,filename)))continue;
    const html=get(filename);
    must(html.includes('class="compact-answer"'),'article summary missing '+filename);
    must(!html.includes('class="compact-answer-label"'),'AI pseudo-label still shown '+filename);
    must(html.includes('data-compact-open="true"'),'full article toggle missing '+filename);
    const inner=html.match(/<div class="article-content">([\s\S]*?)<div class="disclaimer">/)?.[1]||'';
    must(inner.length>2000,'original article body removed '+filename);
    must((html.match(/<link rel="canonical"/g)||[]).length===1,'article canonical altered '+filename);
    articles++;
  }
}
must(articles===46,'expected 46 preserved editorial guides, got '+articles);
console.log('[concise-qa] Removed AI-like guide prose and 46 duplicate labels; kept core tools, original source URLs, ads and article SEO.');
