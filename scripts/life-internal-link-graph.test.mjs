import test from 'node:test';
import assert from 'node:assert/strict';
import {linkDestination,extractInternalLinks,discoverGraph} from './life-internal-link-graph-core.mjs';

test('relative and canonical Pagero URLs resolve to the same local guide',()=>{
  for(const target of [
    '/car/car-inspection-period/',
    '/life/car/car-inspection-period/',
    'https://pagero.kr/life/car/car-inspection-period/',
  ])assert.equal(linkDestination(target,'/support/'),'/car/car-inspection-period/');
  assert.equal(linkDestination('../car/','/support/'),'/car/');
  assert.equal(linkDestination('/food/index.html','/'),'/food/');
  assert.equal(linkDestination('/','/finance/'),'/');
});

test('never mistake other sites, Pagero root or navigational fragment for LIFE content',()=>{
  for(const href of [
    '',null,'#contents','javascript:alert(1)','mailto:test@example.org',
    'https://pagero.kr/','https://example.org/car/','//example.org/car/',
  ])assert.equal(linkDestination(href,'/'),null);
});

test('follow only HTML anchors, not CSS, scripts, metadata or nofollow paid placements',()=>{
  const html='<link rel="canonical" href="https://pagero.kr/life/support/">'+
    '<script src="/not-a-page.js"></script>'+
    '<a href="/car/car-inspection-period/">조회</a>'+
    '<a class="x" href="/life/car/car-inspection-period/#part-1">세부</a>'+
    '<a href="https://pagero.kr/life/food/?q=굴">먹거리</a>'+
    '<a href="/deals/" rel="sponsored nofollow">상품</a>'+
    '<a href="#faq">FAQ</a>'+
    "<a href='../support/' aria-label='지원금'>지원금</a>";
  assert.deepEqual(extractInternalLinks(html,'/finance/'),[
    '/car/car-inspection-period/','/food/','/support/'
  ]);
});

test('a page that only appears in the sitemap does not become discoverable',()=>{
  const graph=new Map([
    ['/', ['/car/','/foo/']],
    ['/car/',['/car/inspection/']],
    ['/car/inspection/',['/']],
    ['/food/',[]]
  ]);
  const found=discoverGraph(graph);
  assert.deepEqual(found.get('/car/inspection/'),['/','/car/','/car/inspection/']);
  assert.equal(found.has('/food/'),false);
  assert.equal(found.has('/foo/'),false);
});
