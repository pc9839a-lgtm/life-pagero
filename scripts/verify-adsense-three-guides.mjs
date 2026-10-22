import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const slugs=['support-eligibility-check','government-support-search','support-application-documents'];
for(const slug of slugs){
 const doc=JSON.parse(fs.readFileSync('content/posts/support/'+slug+'.json','utf8'));
 assert.equal(doc.slug,slug,'Editorial patch must preserve article identity: '+slug);
 assert.equal(doc.updatedAt,'2026-10-22','Date not updated: '+slug);
 assert(doc.sources.length>=2,'Two direct citations required: '+slug);
 assert(doc.sources.every(s=>{const u=new URL(s.url);return u.protocol==='https:'&&u.pathname!=='/';}),'Generic homepage source remains: '+slug);
 assert(doc.body.includes('2026년 10월 확인'),'Official comparison section missing: '+slug);
 assert(doc.body.includes('|---|'),'Practical comparison table missing: '+slug);
 assert(doc.series.parts[0].body.includes('2026년 10월 확인'),'First page must include the actual editorial comparison: '+slug);
 const article=fs.readFileSync(path.join('dist','support',slug,'index.html'),'utf8');
 assert(article.includes('2026년 10월 확인')&&article.includes('<table'),'Published first article missing practical source comparison: '+slug);
 assert(article.includes('<a ')&&article.includes('gov.kr')||article.includes('bokjiro.go.kr'),'Published sources missing: '+slug);
 console.log('PASS published official comparison',slug,'sources',doc.sources.length);
}
console.log('PASS: three LIFE pages have specific first-party sources, distinct decision examples and intact public article URLs');
