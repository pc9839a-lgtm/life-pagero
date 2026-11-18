import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE, checkRootRobots, robotsAllows,
  ensureIndexable, ensureContinuationNoindex,
  ensurePreviewIsNotIndexable, ensureDeploymentManifest
} from './seo-runtime-rules.mjs';

const headers=(items={})=>new Headers(items);
const articleUrl=SITE+'/car/car-inspection-period/';
const canonicalHTML='<html><head><title>자동차 검사기간 | 생활비서</title>'
  +'<meta name="description" content="자동차 검사기간과 검사 예약 방법을 공식 자료로 확인하는 생활정보 안내 페이지입니다.">'
  +'<meta name="robots" content="index,follow,max-image-preview:large">'
  +'<link rel="canonical" href="'+articleUrl+'"></head><body><h1>자동차 검사기간</h1></body></html>';
const noindexHTML=(url)=>'<html><head><meta name="robots" content="noindex,follow">'
  +'<link rel="canonical" href="'+url+'"></head><body><h1>상세 내용</h1></body></html>';

test('root robots permits the /life/ directory and advertises the exact sitemap',()=>{
  const root='User-agent: *\nAllow: /\nDisallow: /api\n\n'
    +'User-agent: GPTBot\nDisallow: /\n\nSitemap: https://pagero.kr/life/sitemap.xml\n';
  assert.doesNotThrow(()=>checkRootRobots(root));
  assert.equal(robotsAllows(root,'/life/'),true);
  assert.equal(robotsAllows(root,'/api'),false);
});

test('host root policy, not nested /life/robots.txt, controls crawling',()=>{
  const blocked='User-agent: *\nDisallow: /life/\n'
    +'Sitemap: https://pagero.kr/life/sitemap.xml';
  assert.throws(()=>checkRootRobots(blocked),/robots disallows/);
  assert.throws(()=>checkRootRobots('User-agent: *\nAllow: /\n'),/sitemap/i);
});

test('allow override and Googlebot-specific user agent are evaluated',()=>{
  const configured='User-agent: *\nDisallow: /\nAllow: /life/\n'
    +'User-agent: GPTBot\nDisallow: /\n';
  assert.equal(robotsAllows(configured,'/life/car/'),true);
  assert.equal(robotsAllows(configured,'/car/'),false);
  const googlebot='User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /life/\n';
  assert.equal(robotsAllows(googlebot,'/life/car/'),false);
});

test('public indexability needs public proxy, self-canonical and indexable robots',()=>{
  const good={status:200,headers:headers({'X-Pagero-Life-Proxy':'1'}),content:canonicalHTML};
  assert.doesNotThrow(()=>ensureIndexable(good,articleUrl));
  assert.throws(()=>ensureIndexable({...good,headers:headers()},articleUrl),/bypassed/);
  assert.throws(()=>ensureIndexable({...good,headers:headers({'X-Pagero-Life-Proxy':'1','X-Robots-Tag':'noindex,follow'})},articleUrl),/noindex/);
  assert.throws(()=>ensureIndexable({...good,content:canonicalHTML.replace(articleUrl,SITE+'/support/')},articleUrl),/Canonical mismatch/);
});

test('all continuation URLs must remain self-canonical and explicitly noindex',()=>{
  const url=articleUrl+'2/';
  const good={status:200,headers:headers(),content:noindexHTML(url)};
  assert.doesNotThrow(()=>ensureContinuationNoindex(good,url));
  assert.throws(()=>ensureContinuationNoindex({...good,content:canonicalHTML},url),/noindex/);
  assert.throws(()=>ensureContinuationNoindex({...good,content:noindexHTML(articleUrl)},url),/canonical mismatch/);
});

test('duplicate www hostname must either redirect permanently or be noindex',()=>{
  const preview='https://www.pagero.kr/life/car/car-inspection-period/';
  const redirected={status:301,headers:headers({Location:articleUrl}),content:''};
  assert.doesNotThrow(()=>ensurePreviewIsNotIndexable(redirected,preview,articleUrl));
  const suppressed={status:200,headers:headers({'X-Robots-Tag':'noindex,follow'}),content:canonicalHTML};
  assert.doesNotThrow(()=>ensurePreviewIsNotIndexable(suppressed,preview,articleUrl));
  assert.throws(()=>ensurePreviewIsNotIndexable({
    status:200,headers:headers(),content:canonicalHTML
  },preview,articleUrl),/indexable/);
});

test('live manifest must identify a deployed main-branch Cloudflare build',()=>{
  const sha='a'.repeat(40), other='b'.repeat(40);
  const manifest={repository:'pc9839a-lgtm/life-pagero',commit:sha,
    branch:'main',environment:'cloudflare-pages'};
  const good={status:200,content:JSON.stringify(manifest)};
  assert.equal(ensureDeploymentManifest(good,sha).commit,sha);
  assert.throws(()=>ensureDeploymentManifest(good,other),/stale/);
  assert.throws(()=>ensureDeploymentManifest({
    status:200,content:JSON.stringify({...manifest,commit:null})
  }),/Git commit/);
  assert.throws(()=>ensureDeploymentManifest({
    status:200,content:JSON.stringify({...manifest,branch:'preview'})
  }),/not main/);
});

test('every sitemap route is checked against Googlebot and Naver Yeti, not three samples',()=>{
  const siteMapRoutes=[
    SITE+'/',SITE+'/car/car-inspection-period/',SITE+'/support/child-allowance-2026/',
    SITE+'/food/',SITE+'/finance/savings/'
  ];
  const targeted='User-agent: *\nAllow: /\nDisallow: /life/food/\n'
    +'Sitemap: '+SITE+'/sitemap.xml';
  // Existing representative URL checks were falsely green.
  assert.doesNotThrow(()=>checkRootRobots(targeted));
  assert.throws(()=>checkRootRobots(targeted,siteMapRoutes),/Googlebot robots disallows \/life\/food\//);
  const naverOnly='User-agent: *\nAllow: /\n'
    +'User-agent: Yeti\nDisallow: /life/finance/\n'
    +'Sitemap: '+SITE+'/sitemap.xml';
  assert.throws(()=>checkRootRobots(naverOnly,siteMapRoutes),/Yeti robots disallows \/life\/finance\//);
  const good='User-agent: *\nAllow: /\nSitemap: '+SITE+'/sitemap.xml';
  assert.equal(checkRootRobots(good,siteMapRoutes),siteMapRoutes.length);
});

test('live indexability rejects absent, duplicated or short SEO snippets',()=>{
  const good={status:200,headers:headers({'X-Pagero-Life-Proxy':'1'}),content:canonicalHTML};
  const title='<title>자동차 검사기간 | 생활비서</title>';
  const desc='<meta name="description" content="자동차 검사기간과 검사 예약 방법을 공식 자료로 확인하는 생활정보 안내 페이지입니다.">';
  assert.throws(()=>ensureIndexable({...good,content:canonicalHTML.replace(title,'')},articleUrl),/HTML title/);
  assert.throws(()=>ensureIndexable({...good,content:canonicalHTML.replace(title,title+title)},articleUrl),/HTML title/);
  assert.throws(()=>ensureIndexable({...good,content:canonicalHTML.replace(desc,'')},articleUrl),/meta description/);
  assert.throws(()=>ensureIndexable({...good,content:canonicalHTML.replace(desc,'<meta name="description" content="짧음">')},articleUrl),/meta description/);
});
