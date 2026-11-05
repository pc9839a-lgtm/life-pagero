// Deterministic loan math shared by the browser and Node tests.
// All calculations assume fixed nominal annual interest / 12 and monthly due dates.
const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
const assert = (valid, message) => { if (!valid) throw new Error(message); };

export function loanSchedule({
  principal, annualRate, months, method = 'equal-payment',
  graceMonths = 0, extraMonthly = 0
}) {
  principal = Number(principal);
  annualRate = Number(annualRate);
  months = Number(months);
  graceMonths = Number(graceMonths);
  extraMonthly = Number(extraMonthly);
  assert(Number.isFinite(principal) && principal >= 1 && principal <= 100000000000,
    '대출금액은 1원부터 1,000억 원까지 입력하세요.');
  assert(Number.isFinite(annualRate) && annualRate >= 0 && annualRate <= 100,
    '연이율은 0~100%로 입력하세요.');
  assert(Number.isInteger(months) && months >= 1 && months <= 600,
    '상환기간은 1~600개월로 입력하세요.');
  assert(Number.isInteger(graceMonths) && graceMonths >= 0 && graceMonths < months,
    '거치기간은 0개월부터 전체 기간 미만으로 입력하세요.');
  assert(Number.isFinite(extraMonthly) && extraMonthly >= 0 && extraMonthly <= principal,
    '월 추가상환액은 0원 이상 대출금액 이하여야 합니다.');
  assert(['equal-payment', 'equal-principal', 'bullet'].includes(method),
    '올바른 상환방식을 선택하세요.');
  let balance = cents(principal);
  const rows = [];
  const r = annualRate / 100 / 12;
  const repaymentMonths = months - graceMonths;
  // The scheduled payment excludes voluntary extra repayments.
  const factor = r === 0 ? 0 : -Math.expm1(-repaymentMonths * Math.log1p(r));
  const fixedPayment = r === 0 ? balance / repaymentMonths : balance * r / factor;
  const fixedPrincipal = balance / repaymentMonths;
  let totalInterest = 0;
  let totalPaid = 0;
  for (let month = 1; month <= months && balance > 0; month += 1) {
    const opening = balance;
    const interest = cents(opening * r);
    const inGrace = method !== 'bullet' && month <= graceMonths;
    const isFinal = month === months;
    let scheduledPrincipal = 0;
    if (!inGrace && method === 'equal-payment') {
      scheduledPrincipal = isFinal
        ? opening
        : Math.max(0, Math.min(opening, cents(fixedPayment - interest)));
    } else if (!inGrace && method === 'equal-principal') {
      scheduledPrincipal = isFinal ? opening : Math.min(opening, cents(fixedPrincipal));
    } else if (method === 'bullet' && isFinal) {
      scheduledPrincipal = opening;
    }
    let extraPrincipal = Math.min(cents(extraMonthly), Math.max(0, cents(opening - scheduledPrincipal)));
    scheduledPrincipal = cents(scheduledPrincipal);
    let paidPrincipal = cents(scheduledPrincipal + extraPrincipal);
    if (paidPrincipal >= opening || isFinal) {
      paidPrincipal = opening;
      extraPrincipal = Math.max(0, cents(paidPrincipal - scheduledPrincipal));
      balance = 0;
    } else {
      balance = cents(opening - paidPrincipal);
    }
    const payment = cents(paidPrincipal + interest);
    totalInterest = cents(totalInterest + interest);
    totalPaid = cents(totalPaid + payment);
    rows.push({
      month, opening, interest, principal: paidPrincipal,
      scheduledPrincipal, extraPrincipal, payment, balance
    });
  }
  const first = rows[0] || null;
  const last = rows[rows.length - 1] || null;
  return {
    method, principal, annualRate, months, graceMonths, extraMonthly,
    firstPayment: first?.payment || 0,
    lastPayment: last?.payment || 0,
    maxPayment: Math.max(0, ...rows.map(row => row.payment)),
    totalInterest, totalPaid,
    paidOffMonths: last?.month || 0,
    rows
  };
}
