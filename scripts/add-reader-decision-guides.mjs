import fs from 'node:fs';
import path from 'node:path';

// Editorially selected decision aids. Do not infer individual benefit eligibility.
// All destination articles must exist and show their original source review dates.
const CONTENT=path.resolve('content/posts');
const DIST=path.resolve('dist');
const guides=[
  {
    slug:'car/car-inspection-period',
    title:'검사기간을 확인한 뒤에는?',
    rows:[
      ['아직 검사 가능 기간 안이라면','차량에 맞는 검사소와 예약 시 필요한 정보를 확인합니다.','car/car-inspection-reservation','예약·당일 준비물'],
      ['이미 기간을 넘겼다면','검사 의무와 과태료 확인은 별개입니다. 먼저 지연 기간과 이후 절차를 살펴보세요.','car/car-inspection-late-penalty','기한 초과 시 처리'],
      ['정기검사·종합검사가 헷갈린다면','차종·용도와 등록 지역 조건을 구분한 뒤 공식 조회 화면의 종류를 기준으로 판단하세요.','car/car-inspection-fall-check-2026','검사 종류 비교'],
    ],
  },
  {
    slug:'car/car-inspection-reservation',
    title:'예약 전에 빠르게 점검할 것',
    rows:[
      ['차량 검사 종류가 확실하지 않다면','예약 시간을 고르기 전에 차량별 검사 종류와 유효기간을 먼저 조회하세요.','car/car-inspection-period','차량별 기간 조회'],
      ['원하는 검사소가 예약되지 않는다면','차종별로 검사 가능한 장소가 다를 수 있습니다. 예약 조건과 대체 검사소를 확인하세요.','car/car-inspection-period','검사 종류·조건 확인'],
      ['검사 유효기간이 이미 끝났다면','예약과 별도로 지연 과태료 고지 및 검사 완료 후 처리 사항을 확인하세요.','car/car-inspection-late-penalty','과태료·완료 후 확인'],
    ],
  },
  {
    slug:'car/used-car-transfer-documents',
    title:'명의이전 방식에 따라 확인할 서류가 달라집니다',
    rows:[
      ['매도인과 매수인이 직접 처리한다면','자동차등록증과 거래 정보를 대조하고 서명·신분 확인 등 당사자별 준비물을 챙기세요.','car/used-car-transfer-cost','등록비용 함께 확인'],
      ['한 사람이 방문하기 어렵다면','위임·인감 관련 서류가 필요한지 관할 등록기관 기준을 먼저 확인하세요.','car/used-car-online-transfer','온라인 이전등록 조건'],
      ['압류·저당·공동명의가 얽혀 있다면','단순 온라인 처리 가능 여부부터 확인하고 방문등록이 필요한 상황을 구분하세요.','car/car-registration-ledger-lien-mortgage-check','등록원부 확인'],
    ],
  },
  {
    slug:'car/used-car-transfer-cost',
    title:'이전비용 견적을 볼 때 빠지기 쉬운 항목',
    rows:[
      ['차량 가격에 세율만 적용했다면','취득세 이외의 채권·등록비·번호판 관련 비용이 있는지 구분해서 계산하세요.','car/used-car-transfer-documents','등록서류 확인'],
      ['매매 당사자가 함께 가지 않는다면','대리 처리로 필요한 서류와 비용 조건이 달라지는지 미리 확인하세요.','car/used-car-transfer-documents','방문 방식별 준비물'],
      ['온라인 신청으로 끝내려 한다면','전자신청이 가능한 명의 구조인지 확인하고 납부·등록 완료 단계를 따로 점검하세요.','car/used-car-online-transfer','온라인 진행 조건'],
    ],
  },
  {
    slug:'support/child-allowance-2026',
    title:'아동수당과 다른 양육 지원을 구분하세요',
    rows:[
      ['아동수당 연령에 해당하는지 궁금하다면','출생연도만으로 판단하지 말고 아동의 생년월일과 적용 시점의 연령 기준을 대조하세요.','support/parental-benefit-2026','부모급여와 대상 차이'],
      ['영아를 돌보고 있다면','아동수당과 부모급여는 같은 제도가 아닙니다. 월령·보육서비스 이용에 따른 지급 방식을 각각 확인하세요.','support/parental-benefit-2026','부모급여 이용 조건'],
      ['출생 직후 받을 지원을 정리한다면','별도 신청이 필요한 지원이 있는지 확인하고 신청기한을 따로 적어 두세요.','support/first-meeting-voucher-2026','첫만남이용권 확인'],
    ],
  },
  {
    slug:'support/parental-benefit-2026',
    title:'부모급여 신청 전에 구분할 세 가지',
    rows:[
      ['출생 직후 신청 중이라면','신청 시점에 따라 소급 지원 여부가 달라질 수 있으므로 출생일과 접수일을 확인하세요.','support/first-meeting-voucher-2026','출생 관련 별도 지원'],
      ['어린이집을 이용한다면','현금 지급액만 보지 말고 보육료 바우처와의 정산 방식을 함께 확인하세요.','support/childcare-service-government-support-2026','돌봄서비스 지원'],
      ['아동수당도 받을 수 있는지 확인하려면','부모급여와 아동수당의 연령·지급 기준을 혼동하지 말고 각각 안내를 확인하세요.','support/child-allowance-2026','아동수당 별도 기준'],
    ],
  },
  {
    slug:'support/livelihood-benefit-2026',
    title:'생계급여와 혼동하기 쉬운 별도 제도',
    rows:[
      ['주거비 지원도 필요하다면','주거급여는 생계급여와 선정기준과 지원 방식이 다릅니다. 같은 기준으로 계산하지 말고 별도로 확인하세요.','support/housing-benefit-2026','주거급여 대상·신청조건'],
      ['가구에 만 65세 이상 어르신이 있다면','기초연금은 별도 제도입니다. 연령과 소득인정액 등 신청 기준을 각각 확인하세요.','support/basic-pension-2026','기초연금 선정기준 확인'],
    ],
  },
  {
    slug:'support/housing-benefit-2026',
    title:'주거급여와 함께 비교할 생활지원 제도',
    rows:[
      ['생활비 지원도 살펴본다면','생계급여와 주거급여는 수급자 선정 기준과 지원액 산정 방식이 다릅니다. 한 제도만 보고 나머지를 단정하지 마세요.','support/livelihood-benefit-2026','생계급여 대상·지급기준'],
      ['가구에 기초연금 신청 대상자가 있다면','기초연금은 주거급여의 다른 이름이 아닙니다. 가구 특성과 각 제도의 별도 기준을 확인하세요.','support/basic-pension-2026','기초연금 기준 확인'],
    ],
  },
];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const post=new Map();
for(const category of ['car','support']){
 for(const file of fs.readdirSync(path.join(CONTENT,category))){
  if(!file.endsWith('.json'))continue;
  const row=JSON.parse(fs.readFileSync(path.join(CONTENT,category,file),'utf8'));
  if(!row.noindex)post.set(category+'/'+row.slug,row);
 }
}
for(const guide of guides){
 const item=post.get(guide.slug);
 if(!item)throw Error('Decision guide source article missing: '+guide.slug);
 const dest=path.join(DIST,guide.slug,'index.html');
 if(!fs.existsSync(dest))throw Error('Decision guide built HTML missing: '+guide.slug);
 let html=fs.readFileSync(dest,'utf8');
 if(html.includes('class="reader-decision"'))throw Error('Double guide injection: '+guide.slug);
 if(!html.includes('<section class="source-box">'))throw Error('Article source anchor absent: '+guide.slug);
 const rows=guide.rows.map(([situation,advice,target,label])=>{
  const linked=post.get(target);
  if(!linked)throw Error('Unpublished destination: '+target);
  if(!linked.reviewedAt)throw Error('Missing official-source review date: '+target);
  return '<tr><th scope="row">'+esc(situation)+'</th><td>'+esc(advice)+'</td><td><a href="/'+esc(target)+'/">'+esc(label)+' ↗</a><span class="decision-date">공식자료 확인 '+esc(linked.reviewedAt)+'</span></td></tr>';
 }).join('');
 const addition='<section class="reader-decision" aria-label="'+esc(guide.title)+'"><h2>'+esc(guide.title)+'</h2><p>아래 표는 선택할 글을 찾는 안내이며 개인별 신청 가능 여부를 판정하지 않습니다. 연결된 글의 확인일과 공식자료를 최종 기준으로 확인하세요.</p><div class="decision-table-wrap"><table><thead><tr><th scope="col">현재 상황</th><th scope="col">확인할 사항</th><th scope="col">다음에 읽을 글</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>';
 html=html.replace('<section class="source-box">',addition+'<section class="source-box">');
 fs.writeFileSync(dest,html);
}
console.log('Reader-decision comparisons added to '+guides.length+' original, indexable guide pages only; all targets and source-review dates verified.');
