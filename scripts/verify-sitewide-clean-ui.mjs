import fs from 'node:fs';
import path from 'node:path';

const dist=path.resolve('dist');
const check=(truth,label)=>{if(!truth)throw Error('[sitewide-audit] '+label)};
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>
  e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const filenames=walk(dist).filter(f=>f.endsWith('.html'));
const read=name=>fs.readFileSync(path.join(dist,name),'utf8');
const home=read('index.html');
const count=(s,re)=>(s.match(re)||[]).length;
check(filenames.length>=150,'All rendered pages should still exist; got '+filenames.length);
check(!home.includes('class="today-glance"'),'Dense four-widget Today dashboard must not occupy homepage');
check(!home.includes('data-today-weather'),'Unconfigured weather panel leaked into homepage');
check(count(home,/class="portal-topic-card compact-topic"/g)===6,'Home must display exactly six topic choices');
check(count(home,/<li><a href="/g)>=3,'Home has lost popular links');
check(count(home.match(/<section class="compact-popular"[\s\S]*?<\/section>/)?.[0]||'',/<li><a href="/g)===3,
  'Homepage popular section must have precisely three links');
check(home.includes('href="/today/"'),'Dedicated Today page link must remain available');
check(count(home,/data-affiliate="tenping-/g)===4,'Affiliate count changed');
check(count(home,/data-life-coupang-kind="(?:body|middle)"/g)===2,'Homepage sponsor count changed');
const actualArticles=[];
for(const area of ['car','support']) {
  const dir=path.join(dist,area);
  for(const f of fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory())) {
    const article=area+'/'+f.name+'/index.html';
    if(fs.existsSync(path.join(dist,article)))actualArticles.push(article);
  }
}
check(actualArticles.length===46,'46 article pages must be preserved: '+actualArticles.length);

const technical=[
 '실시간 공시 데이터 사용 불가','최신 공시 미확인',
 '상품 데이터 인증키가 연결되지','기상청 인증키가',
 '자료를 확인하고 있습니다.','관측 조회 중','뉴스 헤드라인 조회 중',
 'KRW 시세 조회 중','증권 자료 확인 중','언론사 RSS 확인 중',
 '시세 재게시 이용권한','RSS 수집 불가','자료 확인 불가 ·',
 '최신 헤드라인을 확인할 수 없습니다.','코인 시세를 확인할 수 없습니다.',
 '거래소 종가 확인 중','재시도 예정'
];
for(const filename of [
  'index.html','finance/index.html','finance/savings/index.html',
  'finance/markets/index.html','today/index.html'
]) {
  const html=read(filename);
  const found=technical.filter(x=>html.includes(x));
  check(!found.length,'Technical failure strings on '+filename+': '+found.join(','));
}
for(const asset of ['finance-live.js','today-dashboard.js']){
  const code=read(asset);
  const found=technical.filter(x=>code.includes(x));
  check(!found.length,'Visible JS fallback messages leaked in '+asset+': '+found.join(','));
}
const today=read('today/index.html');
check(count(today,/class="today-widget"/g)===4,'Four today modules must remain available on dedicated page');
check(today.includes('https://www.weather.go.kr/')&&today.includes('https://upbit.com/')&&
 today.includes('https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html')&&
 today.includes('https://www.yna.co.kr/'),
 'Official alternatives not available for all four Today modules');
check(today.includes('data-today-fx')&&!today.includes('data-today-stocks'),
 'Today should show FX instead of stock indices');
for(const f of ['finance/index.html','finance/savings/index.html','finance/markets/index.html']){
  const html=read(f);
  check(!html.includes('실시간 공시 데이터 사용 불가'),'Finance error state returned: '+f);
  check(html.includes('href="https://finlife.fss.or.kr/"')||html.includes('href="https://dart.fss.or.kr/"'),
    'No working official financial source on '+f);
}
const savings=read('finance/savings/index.html');
check(savings.includes('id="finance-rate-panel" aria-labelledby="bank-rates-heading" hidden'),
  'Do not show unverified bank quote selectors');
check(read('finance-live.js').includes('if(ratePanel)ratePanel.hidden=true'),
  'Finance failure must hide data panel');
check(read('today-dashboard.js').includes('box.hidden=true'),
  'Failed Today data must hide blank panels');

let canonical=0,buttons=0,assets=0;
const missing=new Set();
for(const filename of filenames){
  const html=fs.readFileSync(filename,'utf8');
  if((html.match(/<link rel="canonical"/g)||[]).length!==1)
    throw Error('[sitewide-audit] Missing or multiple canonical: '+path.relative(dist,filename));
  if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)
    throw Error('[sitewide-audit] Missing or multiple H1: '+path.relative(dist,filename));
  canonical++;
  for(const link of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){
    const target=link[1].replace(/^\/life\//,'/');
    const clean=target.replace(/^\//,'');
    if(!clean)continue;
    let local;
    try{local=decodeURIComponent(clean)}catch{continue}
    if(local.includes('..'))continue;
    const full=path.join(dist,local);
    const options=[full,path.join(full,'index.html'),full+'.html'];
    if(!options.some(file=>fs.existsSync(file)))missing.add(path.relative(dist,filename)+' -> '+target);
    assets++;
  }
}
check(missing.size===0,'Unresolved local links/assets: '+[...missing].slice(0,25).join(' | '));
check(fs.existsSync(path.join(dist,'life-compact.css')),'Minimal mobile stylesheet missing');
check(fs.existsSync(path.join(dist,'today-dashboard.js')),'Today dashboard asset missing');
console.log('[sitewide-audit] PASS '+filenames.length+' HTML, '+canonical+' canonical/H1, '+assets+
 ' internal resources, 46 complete article guides, six home topics, three popular links; zero technical error banners or broken local files.');
