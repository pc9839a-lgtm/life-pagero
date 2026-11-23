import fs from 'node:fs';
import path from 'node:path';

// Editorial evidence gate. Google does not provide an approval prediction.
// This gate tests the actual published first pages and fact-checked records,
// not merely the build timestamp, meta tags or number of generated routes.
const DATE='2026-11-23';
const cases=[
 {slug:'basic-pension-2026',proof:'2026년 10월 30일 이후 온라인 신청에서 달라진 점',links:['wlfareInfoId=WLF00001164','pressReleaseView.do?newsId=156787046']},
 {slug:'disability-allowance-2026',proof:'2026년 11월 공식자료 재확인',links:['a10710030200','a10710030100']},
 {slug:'child-allowance-2026',proof:'2026년 11월 공식 확인: 나이·지역',links:['a10711030100','wlfareInfoId=WLF00001171']},
];
const check=(yes,msg)=>{if(!yes)throw Error('[adsense-editorial] '+msg);};
for(const {slug,proof,links} of cases){
 const file=path.join('content','posts','support',slug+'.json');
 const post=JSON.parse(fs.readFileSync(file,'utf8'));
 const html=fs.readFileSync(path.join('dist','support',slug,'index.html'),'utf8');
 check(post.slug===slug, 'wrong official content identity: '+slug);
 check(post.reviewedAt===DATE&&post.updatedAt===DATE,'fact-check metadata did not survive compressed bundles: '+slug);
 check(post.sources.length>=3,'lost original official references: '+slug);
 const distinct=new Set(post.sources.map(s=>s.url));
 check(distinct.size===post.sources.length,'duplicate official reference: '+slug);
 for(const ref of post.sources){
  check(/^https:\/\//.test(ref.url)&&Date.parse(ref.checkedAt)>=Date.parse('2026-11-01'),
   'stale/unverified official reference '+slug+' '+ref.url);
 }
 check(post.body.includes(proof) && post.series.parts[0].body.includes(proof),
   'practical fact-checked update absent from first indexable article: '+slug);
 check(html.includes(proof),'fact-checked guidance not visible in final HTML: '+slug);
 for(const marker of links){
  check(post.sources.some(s=>s.url.includes(marker)) || post.body.includes(marker),
    'official link proof missing '+slug+' '+marker);
 }
 check(html.includes('공식 출처')&&html.includes('<link rel="canonical"'),
  'original citations or canonical missing: '+slug);
}
const audit=JSON.parse(fs.readFileSync('editorial-quality-report.json','utf8'));
const stale=audit.articles.filter(a=>a.issue_count>0);
check(stale.length===0, 'remaining source-quality warnings: '+JSON.stringify(stale.map(a=>({file:a.file,issues:a.issues}))));
console.log('[adsense-editorial] PASS three officially refreshed guides, visible first-page evidence, zero stale-source quality warnings; AdSense approval is not guaranteed.');
