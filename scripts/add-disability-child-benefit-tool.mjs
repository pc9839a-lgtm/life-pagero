import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Original user utility attached to a fact-checked public guide; no new thin
// SEO URL, private data, cookies, external calculator API or monetization.
const DIST=path.resolve('dist');
const input=path.resolve('content/posts/support/disabled-child-allowance-2026.json');
const page=path.join(DIST,'support/disabled-child-allowance-2026/index.html');
const jsPath=path.join(DIST,'disability-child-allowance-tool.js');
const doc=JSON.parse(fs.readFileSync(input,'utf8'));
const fail=msg=>{throw Error('[benefit-compare] '+msg);};
if(doc.slug!=='disabled-child-allowance-2026'||doc.reviewedAt<'2026-11-24')fail('official factual review is stale');
if(!doc.sources.some(s=>s.url==='https://www.mohw.go.kr/menu.es?mid=a10710030200'))fail('Ministry primary source missing');
if(!fs.existsSync(jsPath))fail('site script is not copied by the static build');
let html=fs.readFileSync(page,'utf8');
if(html.includes('id="life-disabled-child-benefit-tool"'))fail('duplicate installation');
const anchor='<div class="article-content">';
if(!html.includes(anchor))fail('full published article content unavailable');
const body=[
'<section class="benefit-compare" id="life-disabled-child-benefit-tool" aria-labelledby="benefit-compare-title">',
'<div class="benefit-compare-head"><h2 id="benefit-compare-title">2026 장애아동수당 금액 비교</h2>',
'<p>장애정도·수급 유형·거주형태를 선택하면 2026년 공식 지급액표에서 해당 금액을 보여줍니다. 신청 자격을 판정하는 계산기는 아닙니다.</p></div>',
'<div class="benefit-compare-fields">',
'<label for="benefit-grade"><span>장애정도</span><select id="benefit-grade" required><option value="">선택하세요</option><option value="severe">중증</option><option value="mild">경증</option></select></label>',
'<label for="benefit-group"><span>수급 구분</span><select id="benefit-group" required><option value="">선택하세요</option><option value="livelihood">생계·의료급여</option><option value="housing">주거·교육급여 또는 차상위</option></select></label>',
'<label for="benefit-place"><span>거주형태</span><select id="benefit-place" required><option value="">선택하세요</option><option value="home">가정 거주(재가)</option><option value="facility">보장시설 입소</option></select></label>',
'</div><div class="benefit-compare-result" aria-live="polite" aria-atomic="true">',
'<div><span>공식 표의 월 기준금액</span><strong id="benefit-monthly">—</strong></div>',
'<div><span>12개월 단순 합계(참고)</span><strong id="benefit-annual">—</strong></div></div>',
'<p id="benefit-explanation" class="benefit-compare-explanation">장애정도·수급구분·거주형태를 모두 선택하세요.</p>',
'<p class="benefit-compare-source"><strong>자료 확인 2026.11.24</strong> · <a href="https://www.mohw.go.kr/menu.es?mid=a10710030200" target="_blank" rel="noopener noreferrer">보건복지부 원문</a>',
' · <a href="https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003198" target="_blank" rel="noopener noreferrer">복지로 서비스 안내</a></p>',
'<p class="benefit-compare-caution">연령·장애등록·소득인정액·재학 상태와 실제 시설 구분은 별도로 심사합니다. 12개월 합계는 1년 내내 같은 급여액을 받는 경우의 단순 계산이며 지급 보장이 아닙니다.</p>',
'</section>'
].join('');
html=html.replace(anchor,anchor+body);
const hash=createHash('sha256').update(fs.readFileSync(jsPath)).digest('hex').slice(0,12);
html=html.replace('</head>','<script type="module" src="/disability-child-allowance-tool.js?v='+hash+'"></script></head>');
if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1 ||(html.match(/<link rel="canonical"/g)||[]).length!==1)fail('canonical or H1 mutated');
if(!html.includes('class="source-box"')||!html.includes('class="article-content"'))fail('original source/content missing');
fs.writeFileSync(page,html);
console.log('[benefit-compare] Added no-login 2026 monthly/annual rate comparison to original first page; unchanged canonicals, no new indexable URL.');
