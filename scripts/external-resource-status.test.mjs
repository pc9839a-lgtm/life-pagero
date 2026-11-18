import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyExternalResponse as classify} from './external-resource-status.mjs';
const u='https://example.go.kr/notice/2026/';

test('real deleted records fail, never rewritten to successful status',()=>{
  for(const status of [404,410]){
    assert.deepEqual(classify({requestedUrl:u,status}),{
      level:'error',cause:'hard-not-found',message:'hard failure HTTP '+status
    });
  }
});
test('rate limits, anti-bot restrictions and 417 never count as verified links',()=>{
  for(const status of [401,403,405,408,417,429]){
    const x=classify({requestedUrl:u,status});
    assert.equal(x.level,'warning');
    assert.equal(x.cause,'access-restricted');
  }
});
test('the actual security challenge redirect cannot masquerade as HTTP 200',()=>{
  const x=classify({requestedUrl:'https://www.cyberts.kr/',
    responseUrl:'https://www.kotsa.or.kr/security/secure/security.html',status:200});
  assert.equal(x.cause,'security-interstitial');
  assert.equal(x.level,'warning');
});
test('a deep citation landing on homepage is not confirmed healthy',()=>{
  const x=classify({requestedUrl:u,responseUrl:'https://www.example.go.kr/',status:200});
  assert.equal(x.cause,'homepage-redirect');
});
test('ordinary original pages, www swaps and expected document types remain healthy',()=>{
  assert.equal(classify({requestedUrl:u,responseUrl:u,status:200}).level,'ok');
  assert.equal(classify({requestedUrl:u,responseUrl:'https://www.example.go.kr/notice/2026/',status:200}).level,'ok');
  assert.equal(classify({requestedUrl:'https://images.example.com/a.webp',status:200,
    responseUrl:'https://images.example.com/a.webp',isImage:true,contentType:'image/webp'}).level,'ok');
});
test('redirect downgrade, missing images and outages are distinguishable',()=>{
  assert.equal(classify({requestedUrl:u,responseUrl:'http://example.go.kr/notice/2026/',status:200}).cause,'insecure-redirect');
  assert.equal(classify({requestedUrl:u,responseUrl:u,status:503}).cause,'temporary-server-response');
  assert.equal(classify({requestedUrl:u,responseUrl:u,status:301}).cause,'unexpected-http-response');
  assert.equal(classify({requestedUrl:'https://images.example.com/a.png',status:200,
    isImage:true,contentType:'text/html'}).cause,'image-content-type');
});
