// Pure annual vehicle ownership-cost estimator. All costs are entered by the
// user in KRW; no assumed live fuel price, tax bill or insurance quote.
export function calculateCarCost(input){
  const names=['annualKm','unitPrice','efficiency','insuranceYear','carTaxYear',
    'parkingMonth','tollMonth','washingMonth','maintenanceYear',
    'inspectionYear','tiresYear','depreciationYear','loanMonthly'];
  const x={};
  for(const k of names){
    x[k]=Number(input[k]??0);
    if(!Number.isFinite(x[k])||x[k]<0)throw new RangeError(k+'는 0 이상의 숫자여야 합니다.');
  }
  if(x.annualKm>200000)throw new RangeError('연간 주행거리는 20만 km 이하여야 합니다.');
  if(x.efficiency<=0||x.efficiency>100)throw new RangeError('연비·전비는 0보다 크고 100 이하여야 합니다.');
  if(x.unitPrice>100000)throw new RangeError('연료·충전 단가를 확인하세요.');
  for(const k of names.filter(k=>!['annualKm','unitPrice','efficiency'].includes(k)))
    if(x[k]>100000000)throw new RangeError('비용 입력값을 확인하세요.');
  const energyYear=Math.round(x.annualKm/x.efficiency*x.unitPrice);
  const breakdown=[
    {id:'energy',label:'주유·충전',annual:energyYear},
    {id:'insurance',label:'자동차 보험',annual:x.insuranceYear},
    {id:'tax',label:'자동차세',annual:x.carTaxYear},
    {id:'parking',label:'주차비',annual:x.parkingMonth*12},
    {id:'toll',label:'통행료',annual:x.tollMonth*12},
    {id:'wash',label:'세차비',annual:x.washingMonth*12},
    {id:'maintenance',label:'정비·소모품',annual:x.maintenanceYear},
    {id:'inspection',label:'검사비',annual:x.inspectionYear},
    {id:'tires',label:'타이어',annual:x.tiresYear},
    {id:'depreciation',label:'감가상각',annual:x.depreciationYear},
    {id:'loan',label:'차량대출 월납입',annual:x.loanMonthly*12}
  ];
  const annual=Math.round(breakdown.reduce((sum,row)=>sum+row.annual,0));
  const monthly=Math.round(annual/12);
  const perKm=x.annualKm>0?Math.round(annual/x.annualKm):0;
  return {annual,monthly,perKm,energyYear,breakdown,annualKm:x.annualKm};
}
