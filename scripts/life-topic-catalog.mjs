// Six truthful editorial topic groups for current /car/ and /support/ articles.
// Topic pages DO NOT change the articles' original canonical slugs.
export const TOPIC_GROUPS = [
  {id:'finance-tax',title:'금융·세금',description:'금리·대출 조건, 세금 신고와 환급 확인',icon:'receipt',intro:'예금과 대출의 비용을 비교하고 세금 신고·환급 내용을 확인하세요. 계산기는 예상 결과이며 실제 납부액과 상품 가입조건은 공식 원문이 우선입니다.',summary:'금리비교와 금융 계산, 세금 신고, 공제·환급의 선택 기준을 모았습니다.',moreHref:'/finance/',moreLabel:'금융 계산기와 금리 비교'},
  {id:'welfare',title:'지원금·복지',description:'기초생활·육아·복지지원 대상과 신청',icon:'support',intro:'가구·소득·나이와 실제 신청기간이 서로 다른 정부지원 제도를 구분해 보세요. 대상 여부는 담당 기관의 심사와 공고 원문에서 확정됩니다.',summary:'기초연금·가족·아동·생활지원 등 신청대상과 준비서류를 모았습니다.',moreHref:'/support/',moreLabel:'전체 정부지원 글'},
  {id:'housing',title:'주거·부동산',description:'전월세 계약, 보증금과 주거 지원',icon:'house',intro:'계약 체결부터 전입신고, 월세 지원과 보증금 반환까지 실제 주거 상황별로 필요한 자료를 살펴보세요. 계약 조건과 법적 권리관계는 직접 확인해야 합니다.',summary:'주거급여·전월세·전입신고·보증금 반환 관련 가이드를 모았습니다.',moreHref:'/finance/mortgage-calculator/',moreLabel:'주택담보대출 계산기'},
  {id:'car',title:'자동차',description:'검사·명의이전·자동차세·면허',icon:'car',intro:'자동차 검사, 명의이전, 세금, 운전면허 관련 행정 절차를 한곳에서 살펴볼 수 있습니다.',summary:'검사기간·등록·세금·면허 등 자동차 생활행정의 핵심 내용을 모았습니다.',moreHref:'/tools/car-cost/',moreLabel:'자동차 유지비 계산기'},
  {id:'work',title:'취업·노동',description:'퇴직금·실업급여·휴가·직업훈련',icon:'work',intro:'퇴직과 재취업, 근로수당·휴가 및 고용지원은 각각 적용 대상과 절차가 다릅니다. 고용형태와 근로기간부터 확인하세요.',summary:'퇴직금·실업급여·근로자 지원·직업훈련의 자격과 계산 절차를 모았습니다.',moreHref:'/support/',moreLabel:'정부지원 전체 보기'},
  {id:'daily',title:'생활·건강',description:'여권·주민등록·의료·통신·증명서',icon:'health',intro:'일상에서 자주 필요한 신분증·여권·증명서 신청과 의료·통신 생활비 업무를 모았습니다. 제출기관이 요구하는 서류 종류와 발급 형태를 먼저 확인하세요.',summary:'여권·증명서·건강보험·통신 생활민원을 주제별로 확인할 수 있습니다.',moreHref:'/topics/',moreLabel:'생활정보 전체 보기'}
];
const EXPLICIT = {
  'finance-tax': [
    'year-end-tax-precheck-2026','earned-income-tax-credit-late-2026',
    'monthly-rent-tax-credit-cash-receipt-2026',
    'freelancer-withholding-tax-33-guide','savings-deposit-preferential-interest-guide'
  ],
  housing: [
    'housing-benefit-2026','youth-monthly-rent-support-2026',
    'tenant-movein-fixed-date-rent-report-2026','tenant-lease-registration-deposit-return'
  ],
  work: [
    '2026-september-parental-leave-changes','durunuri-social-insurance-support-2026',
    'infertility-leave-benefit-2026','national-employment-support-type1-2026',
    'national-learning-card-2026','unemployment-benefit-eligibility-2026',
    'severance-pay-average-wage-calculation'
  ],
  daily: [
    'flu-vaccination-children-2026','female-youth-hygiene-voucher-2026',
    'heating-energy-support-2026','passport-online-reissue-2026',
    'resident-id-card-reissue-online-2026',
    'health-insurance-out-of-pocket-cap-refund',
    'family-relations-certificate-types-issuance',
    'telecom-unused-refund-smartchoice'
  ]
};
const lookup=new Map(Object.entries(EXPLICIT).flatMap(([id,slugs])=>slugs.map(slug=>[slug,id])));
export const topicGroupId = post => {
  if(post.category==='car')return 'car';
  if(!post || post.category!=='support')throw Error('[topic] Unsupported article category');
  if(post.topicGroup){
    if(!TOPIC_GROUPS.some(g=>g.id===post.topicGroup)||post.topicGroup==='car')
      throw Error('[topic] Invalid explicit topicGroup: '+post.slug);
    return post.topicGroup;
  }
  const explicit=lookup.get(post.slug);
  if(explicit)return explicit;
  const title=String(post.title||'');
  if(/주거|임대차|전세|월세|이사|임차권/.test(title))return 'housing';
  if(/퇴직|실업|고용|근로|직업|내일배움|난임치료휴가/.test(title))return 'work';
  if(/종합소득세|연말정산|공제|부가가치세|금리|이자 계산/.test(title))return 'finance-tax';
  if(/여권|주민등록|증명서|건강보험|예방접종|통신|인감/.test(title))return 'daily';
  return 'welfare';
};
export const groupPosts = posts => {
  const categories=TOPIC_GROUPS.map(group=>({...group,posts:[]}));
  const byId=new Map(categories.map(item=>[item.id,item]));
  for(const post of posts){
    if(post.noindex===true)continue;
    const id=topicGroupId(post);
    const group=byId.get(id);
    if(!group)throw Error('[topic] Missing group for '+post.slug);
    group.posts.push(post);
  }
  for(const group of categories){
    group.posts.sort((a,b)=>
      String(b.updatedAt||b.reviewedAt||b.publishedAt).localeCompare(String(a.updatedAt||a.reviewedAt||a.publishedAt)) ||
      String(a.title).localeCompare(String(b.title),'ko'));
    if(!group.posts.length)throw Error('[topic] Empty published category '+group.id);
  }
  return categories;
};
