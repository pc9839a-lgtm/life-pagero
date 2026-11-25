// 생활비서 2026 장애아동수당 지급액 비교.
// Official references: https://www.mohw.go.kr/menu.es?mid=a10710030200
// The calculation compares the published 2026 benefit schedule; it cannot
// establish eligibility, income recognition, individual awards or start dates.
export function compareDisabilityChildAllowance({grade,group,place}){
  const grades=['severe','mild'],groups=['livelihood','housing'],places=['home','facility'];
  if(!grades.includes(grade)||!groups.includes(group)||!places.includes(place)){
    return {valid:false,reason:'장애정도·수급구분·거주형태를 모두 선택하세요.',monthly:null,annual:null};
  }
  if(place==='facility'&&group!=='livelihood'){
    return {valid:false,reason:'보장시설 지급액은 생계·의료급여 수급자 기준으로 안내됩니다. 시설 유형과 수급자격을 주민센터에 확인하세요.',monthly:null,annual:null};
  }
  const rates={
    home:{livelihood:{severe:220000,mild:110000},housing:{severe:170000,mild:110000}},
    facility:{livelihood:{severe:90000,mild:30000}}
  };
  const monthly=rates[place][group][grade];
  return {valid:true,reason:'보건복지부 2026년 장애아동수당 지급액표의 월 기준금액입니다. 개별 선정과 실제 지급액은 행정기관 결정에 따릅니다.',monthly,annual:monthly*12};
}
function initialize(){
  const root=document.getElementById('life-disabled-child-benefit-tool');
  if(!root)return;
  const grade=root.querySelector('#benefit-grade');
  const group=root.querySelector('#benefit-group');
  const place=root.querySelector('#benefit-place');
  const monthly=root.querySelector('#benefit-monthly');
  const annual=root.querySelector('#benefit-annual');
  const info=root.querySelector('#benefit-explanation');
  const won=new Intl.NumberFormat('ko-KR');
  const render=()=>{
    const value=compareDisabilityChildAllowance({grade:grade.value,group:group.value,place:place.value});
    monthly.textContent=value.valid?won.format(value.monthly)+'원':'—';
    annual.textContent=value.valid?won.format(value.annual)+'원':'—';
    info.textContent=value.reason;
    info.dataset.state=value.valid?'result':'guidance';
  };
  for(const el of [grade,group,place])el.addEventListener('change',render);
  render();
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
}
