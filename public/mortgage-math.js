// Illustrative bank mortgage purchase-loan estimate, amounts in KRW 10,000.
// Not a lender's approval engine. Local rules, collateral appraisal, tenant
// priority, existing debt classifications, income evidence and restrictions
// must be independently confirmed.
const finite=(value,label,min,max)=>{
  const n=Number(value);
  if(!Number.isFinite(n)||n<min||n>max)
    throw new RangeError(label+' 입력값을 확인하세요.');
  return n;
};
export function monthlyAnnuity(principalWon,ratePercent,years){
  const p=finite(principalWon,'대출원금',0,1000000000000);
  const rate=finite(ratePercent,'이자율',0,35);
  const term=finite(years,'대출기간',1,50);
  const months=Math.round(term*12);
  const r=rate/100/12;
  return r===0?p/months:p*r/(1-Math.pow(1+r,-months));
}
export function maxPrincipalFromPayment(monthlyWon,ratePercent,years){
  const payment=finite(monthlyWon,'월 상환가능액',0,10000000000);
  const rate=finite(ratePercent,'이자율',0,35);
  const term=finite(years,'대출기간',1,50);
  const periods=Math.round(term*12),r=rate/100/12;
  return r===0?payment*periods:payment*(1-Math.pow(1+r,-periods))/r;
}
// Area presets as of 2026-11, may change; editable LTV, stress and caps
// are always visible in the UI. Regulated / metro / regional does not decide
// buyer eligibility, repayment exclusions or preferential policy-mortgage rules.
export function mortgagePreset(area,firstHome,homePrice){
  const price=finite(homePrice,'주택가격',1000,1000000);
  if(!['regulated','metro','regional'].includes(area))throw new RangeError('지역 선택을 확인하세요.');
  const first=Boolean(firstHome);
  const ltv=area==='regulated'?(first?70:40):area==='metro'?70:(first?80:70);
  const stress=area==='regional'?0.75:3;
  const cap=(area==='metro'||area==='regulated')
    ?(price<=150000?60000:price<=250000?40000:20000)
    :0; // zero in UI = no area-price cap, not no lending
  return {ltv,stress,cap};
}
export function calculateMortgage(input){
  const price=finite(input.homePrice,'주택가격',1000,1000000);
  const income=finite(input.annualIncome,'인정 연소득',0,1000000);
  const annualDebt=finite(input.existingDebtAnnual,'기존대출 연 원리금',0,1000000);
  const cash=finite(input.cashAvailable??0,'보유 자기자금',0,1000000);
  const ltv=finite(input.ltv,'LTV',0,100);
  const dsr=finite(input.dsr,'DSR',0,100);
  const rate=finite(input.rate,'실제 예상 연이율',0,30);
  const stress=finite(input.stress,'스트레스 가산금리',0,15);
  const years=finite(input.years,'대출기간',1,50);
  const deduction=finite(input.collateralDeduction??0,'선순위채권·방공제',0,1000000);
  const cap=finite(input.regulatoryCap??0,'지역·가격별 대출 상한',0,1000000);
  const ltvLimit=Math.max(0,Math.floor(price*ltv/100-deduction));
  const capLimit=cap===0?Number.POSITIVE_INFINITY:cap;
  const dsrAnnualAllowance=Math.max(0,income*dsr/100-annualDebt);
  const dsrMonthlyAllowanceWon=dsrAnnualAllowance*10000/12;
  const dsrLimit=Math.max(0,Math.floor(
    maxPrincipalFromPayment(dsrMonthlyAllowanceWon,rate+stress,years)/10000
  ));
  const maxLoan=Math.max(0,Math.floor(Math.min(ltvLimit,dsrLimit,capLimit)));
  const actualMonthlyWon=monthlyAnnuity(maxLoan*10000,rate,years);
  const stressMonthlyWon=monthlyAnnuity(maxLoan*10000,rate+stress,years);
  const months=Math.round(years*12);
  const nominalInterest=Math.max(0,Math.round((actualMonthlyWon*months-maxLoan*10000)/10000));
  const closingCash=Math.max(0,price-maxLoan);
  return {
    price,maxLoan,ltvLimit,dsrLimit,capLimit,dsrAnnualAllowance,
    monthlyWon:Math.round(actualMonthlyWon),
    stressMonthlyWon:Math.round(stressMonthlyWon),
    totalInterest:nominalInterest,
    requiredCash:closingCash,
    cashShortfall:Math.max(0,closingCash-cash),
    ltv,dsr,rate,stress,years,
    limitReason:maxLoan===0?'insufficient':
      maxLoan===ltvLimit?'ltv':
      maxLoan===dsrLimit?'dsr':'cap'
  };
}
