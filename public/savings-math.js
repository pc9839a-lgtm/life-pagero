// Monthly fixed contribution, beginning-of-month deposit, simple annual interest.
// Each contribution earns a different number of monthly periods before maturity.
export function calculateSavings({monthlyDeposit, months, annualRate, taxRate=15.4}){
  const deposit=Number(monthlyDeposit), term=Number(months);
  const rate=Number(annualRate), tax=Number(taxRate);
  if(!Number.isSafeInteger(deposit)||deposit<1000||deposit>1000000000)
    throw new RangeError('월 납입액은 1,000원부터 10억원까지 입력하세요.');
  if(!Number.isInteger(term)||term<1||term>120)
    throw new RangeError('기간은 1~120개월로 입력하세요.');
  if(!Number.isFinite(rate)||rate<0||rate>30)
    throw new RangeError('연이율은 0~30%로 입력하세요.');
  if(!Number.isFinite(tax)||tax<0||tax>100)
    throw new RangeError('세율은 0~100%로 입력하세요.');
  const principal=deposit*term;
  // Avoid accumulating individually rounded numbers across months.
  const interestBeforeTax=Math.round(deposit*(rate/100)/12*term*(term+1)/2);
  const estimatedTax=Math.round(interestBeforeTax*tax/100);
  const interestAfterTax=interestBeforeTax-estimatedTax;
  const maturity=principal+interestAfterTax;
  const rows=[];
  for(let index=1;index<=term;index++){
    const earningMonths=term-index+1;
    rows.push({
      installment:index,
      deposit,
      earningMonths,
      estimatedInterest:Math.round(deposit*(rate/100)*earningMonths/12)
    });
  }
  return {principal,interestBeforeTax,estimatedTax,interestAfterTax,maturity,
    monthlyDeposit:deposit,months:term,annualRate:rate,taxRate:tax,rows};
}
