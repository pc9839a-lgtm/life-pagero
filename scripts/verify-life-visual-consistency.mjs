import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Assert the actual source stylesheet for each route, not a late override.
const ROOT=path.resolve('dist');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const esc=value=>value.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
const css={
  theme:read('life-editorial-20261106.css'),
  today:read('today-wide.css'),
  food:read('life-food.css'),
  events:read('events-ui.css'),
  estate:read('real-estate.css'),
  deals:read('adpick-deals.css'),
  finance:read('finance-experience.css')
};
const expectRules=(sheet,selector,property,value)=>{
  const regex=new RegExp(esc(selector)+'\\s*\\{([^{}]*)\\}','g');
  const matches=[...css[sheet].matchAll(regex)];
  assert.ok(matches.length>0,'missing '+sheet+': '+selector);
  for(const item of matches){
    const declaration=new RegExp(esc(property)+'\\s*:\\s*'+esc(value)+'\\s*(?:;|$)');
    assert.match(item[1],declaration,sheet+' '+selector+' must use '+property+': '+value);
  }
};
for(const marker of [
  '--life-page-title-size:36px;--life-section-title-size:24px',
  '--life-body-size:16px;--life-lead-size:15px',
  '--life-page-title-size:28px;--life-section-title-size:21px',
  '--life-body-size:15px;--life-lead-size:14px',
  'font-family:"Pretendard Variable",Pretendard',
  '.life-editorial :is(input,button,select,textarea){font-family:inherit}',
  '--brand:#e95731'
])assert.ok(css.theme.includes(marker),'missing design token: '+marker);

const pageTitles=[
 ['theme','.life-editorial.life-modern-home .portal-home-hero h1'],
 ['theme','.life-editorial.life-modern-category .category-hero h1'],
 ['theme','.life-editorial.life-modern-article .article-header h1'],
 ['theme','.life-editorial .topics-page h1'],
 ['theme','.life-editorial .portal-page.finance-page h1,.life-editorial .portal-page h1'],
 ['theme','.life-editorial .today-wide-content h1'],
 ['theme','.life-editorial .food-guide-header h1'],
 ['today','.life-editorial .today-wide-content .today-page-head h1'],
 ['food','.life-editorial .food-hero h1'],
 ['events','.events-intro h1,.events-detail-head h1'],
 ['events','.events-intro h1'],
 ['estate','.life-editorial .re-h1 h1'],
 ['deals','.life-editorial .adpick-page-heading h1'],
 ['finance','.finance-page h1']
];
for(const [sheet,selector] of pageTitles)
  expectRules(sheet,selector,'font-size','var(--life-page-title-size)');
const sections=[
 ['theme','.life-editorial.life-modern-home .compact-popular-top h2'],
 ['theme','.life-editorial.life-modern-home .life-home-section-heading h2'],
 ['theme','.life-editorial .finance-section-title h2'],
 ['theme','.life-editorial .today-widget-heading h3'],
 ['theme','.life-editorial .food-guide-section h2'],
 ['today','.life-editorial .today-wide-content .today-widget-heading h3'],
 ['food','.life-editorial .food-section h2'],
 ['events','.events-empty h2'],
 ['deals','.life-editorial .adpick-section-head h2'],
 ['finance','.finance-section-title h2']
];
for(const [sheet,selector] of sections)
  expectRules(sheet,selector,'font-size','var(--life-section-title-size)');
const cardTitles=[
 ['theme','.life-editorial.life-modern-home .compact-latest .post-card h3'],
 ['theme','.life-editorial.life-modern-category .post-card h3'],
 ['theme','.life-editorial .finance-hub-card strong'],
 ['theme','.life-editorial .today-news-title'],
 ['theme','.life-editorial .food-shop-name'],
 ['today','.life-editorial .today-wide-content .today-news-title'],
 ['food','.life-editorial .food-card-top h3'],
 ['events','.events-card h3'],
 ['estate','.life-editorial .re-card h2']
];
for(const [sheet,selector] of cardTitles)
  expectRules(sheet,selector,'font-size','var(--life-card-title-size)');
for(const [sheet,selector] of [
 ['theme','.life-editorial.life-modern-article .article-content'],
 ['theme','.life-editorial .food-guide-section p,.life-editorial .food-guide-section li']
])expectRules(sheet,selector,'font-size','var(--life-body-size)');
for(const [sheet,selector] of [
 ['theme','.life-editorial.life-modern-home .life-home-intro'],
 ['theme','.life-editorial .food-guide-lead'],
 ['today','.life-editorial .today-wide-content .today-page-intro'],
 ['events','.events-intro p'],
 ['estate','.life-editorial .re-heading p'],
 ['deals','.life-editorial .adpick-page-heading p'],
 ['finance','.finance-page-intro']
])expectRules(sheet,selector,'font-size','var(--life-lead-size)');

assert.ok(css.theme.includes('.life-editorial .footer-inner h2,.life-editorial .footer-inner h3{font-size:14px;font-weight:760;letter-spacing:-.02em;color:#26323d'),
  'footer heading must remain readable against the light footer background');
assert.ok(!css.events.includes('#1769e0'),'blue events accent still active');
assert.ok(!css.finance.includes('#1769e0'),'blue finance accent still active');
assert.ok(!css.estate.includes('#1450ef'),'blue estate accent still active');
assert.ok(css.estate.includes('font-family:inherit'),'estate overrides site font');
assert.ok(css.deals.includes('font-family:inherit'),'deals overrides site font');
assert.ok(!css.deals.includes('background:#202833'),'inconsistent deals hero remains');
assert.ok(css.theme.includes('.life-editorial .nav-inner{display:grid;grid-template-columns:repeat(8,minmax(0,1fr))'),'desktop nav lost');
assert.ok(css.theme.includes('.life-editorial .nav-inner{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))'),'mobile nav lost');
for(const file of [
 'index.html','today/index.html','events/index.html',
 'food/index.html','deals/index.html','finance/index.html',
 'real-estate/index.html','topics/index.html',
 'car/index.html','support/index.html'
]){
  const html=read(file);
  assert.ok(html.includes('class="life-modern life-editorial '),'theme body missing '+file);
  assert.equal((html.match(/href="\/life-editorial-20261106\.css\?v=/g)||[]).length,1,
    'sitewide theme should appear once '+file);
  assert.ok(html.includes('aria-label="전체 메뉴"'),'nav missing '+file);
}
// The shell, card and form-control scale must be shared, not locally
// reintroduced on only the homepage or in one menu's late stylesheet.
for(const token of [
  '--life-control-height:44px',
  '--life-control-radius:8px',
  '--life-control-border:#dfe3e7',
  '--life-card-border:var(--line)',
  '--life-row-hover:#fff8f5'
])assert.ok(css.theme.includes(token),'missing control/card design token '+token);
for(const [sheet,marker] of [
  ['theme','.life-editorial.life-modern-article .site-shell{max-width:1160px}'],
  ['theme','.life-editorial .portal-page.finance-page h1{font-size:var(--life-page-title-size)}'],
  ['today','width:100%;max-width:var(--content);min-width:0'],
  ['events','.events-shell{width:calc(100% - 72px);max-width:var(--content)'],
  ['estate','.life-editorial .re-shell{max-width:var(--content);width:calc(100% - 72px)'],
  ['finance','.finance-page{max-width:var(--content)'],
  ['deals','max-width:var(--content)'],
  ['food','.life-editorial .food-hub{width:100%;max-width:var(--content)'],
  ['events','.events-shell,.events-home-banner{width:calc(100% - 24px)'],
  ['estate','.life-editorial .re-shell{width:calc(100% - 24px)']
])assert.ok(css[sheet].includes(marker),'inconsistent page shell '+sheet+': '+marker);
for(const [sheet,marker] of [
  ['theme','.life-editorial .sidebar-card{min-width:0;padding:18px;border:1px solid var(--life-card-border);border-radius:var(--life-card-radius)'],
  ['today','border:1px solid var(--life-card-border);border-radius:var(--life-card-radius)'],
  ['events','.events-card{display:flex;flex-direction:column;justify-content:space-between;min-width:0;padding:19px;background:#fff;border:1px solid var(--life-card-border);border-radius:var(--life-card-radius)'],
  ['estate','border:1px solid var(--life-card-border);border-radius:var(--life-card-radius);min-height:190px'],
  ['deals','border:1px solid var(--life-card-border);border-radius:var(--life-card-radius)'],
  ['finance','.finance-hub-card{display:flex;flex-direction:column;gap:5px;background:#fff;border:1px solid var(--life-card-border);border-radius:var(--life-card-radius)']
])assert.ok(css[sheet].includes(marker),'inconsistent card style '+sheet+': '+marker);
for(const [sheet,marker] of [
  ['theme','.life-editorial .today-widget-heading select{min-height:var(--life-control-height)'],
  ['today','min-height:var(--life-control-height);max-width:115px'],
  ['events','min-height:var(--life-control-height);padding:9px 15px'],
  ['estate','.life-editorial .re-tab{min-height:var(--life-control-height)'],
  ['estate','.life-editorial .re-select select{height:var(--life-control-height)'],
  ['finance','height:var(--life-control-height);border:1px solid var(--life-control-border)'],
  ['deals','min-height:var(--life-control-height);padding:8px 13px'],
  ['food','#food-month{min-height:var(--life-control-height)'],
  ['food','#food-servings{min-height:var(--life-control-height)']
])assert.ok(css[sheet].includes(marker),'inconsistent control style '+sheet+': '+marker);

// CSS version changes whenever its content changes. Otherwise an updated
// menu can still appear with the previous typography from the browser cache.
const versionedStyles=['events-ui.css','real-estate.css','adpick-deals.css',
  'life-food.css','finance-experience.css'];
const filesIn=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
  const full=path.join(dir,item.name);
  return item.isDirectory()?filesIn(full):[full];
});
let checkedLinks=0;
for(const file of filesIn(ROOT).filter(file=>file.endsWith('.html'))){
  const html=fs.readFileSync(file,'utf8');
  for(const style of versionedStyles){
    const prefix='href="/'+style;
    if(!html.includes(prefix))continue;
    const hash=createHash('sha256').update(read(style)).digest('hex').slice(0,12);
    assert.ok(html.includes(prefix+'?v='+hash+'"'),
      'CSS cache version is stale in '+path.relative(ROOT,file)+': '+style);
    checkedLinks++;
  }
}
assert.ok(checkedLinks>=5,'expected versioned menu styles on the public pages');

console.log('[visual-consistency] PASS: one Pretendard face and desktop/mobile H1/H2/card/body/lead scales plus shells/cards/controls across ten menus and seven stylesheets');
