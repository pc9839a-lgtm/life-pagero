// Plain, local calculator: no external calls, personal data is not transmitted.
(function () {
  'use strict';
  const form = document.getElementById('portal-loan-form');
  const result = document.getElementById('portal-loan-result');
  if (!form || !result) return;
  const won = value => new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 0
  }).format(Math.round(value)) + '원';
  const numberFrom = id => Number(document.getElementById(id).value);
  function calculate() {
    const principal = numberFrom('loan-principal');
    const percent = numberFrom('loan-rate');
    const months = numberFrom('loan-months');
    if (!Number.isFinite(principal) || principal < 1 || principal > 100000000000 ||
        !Number.isFinite(percent) || percent < 0 || percent > 100 ||
        !Number.isInteger(months) || months < 1 || months > 600) {
      result.innerHTML = '<h2>입력값 확인</h2><p>금액은 1원 이상, 연이율은 0~100%, 상환기간은 1~600개월로 입력하세요.</p>';
      return;
    }
    const monthlyRate = percent / 100 / 12;
    const payment = monthlyRate === 0
      ? principal / months
      : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
    const total = payment * months;
    const interest = Math.max(0, total - principal);
    result.innerHTML = '<h2>예상 상환액</h2>'
      + '<p>월 납입액 <strong>' + won(payment) + '</strong></p>'
      + '<p>총 상환액 ' + won(total) + '</p>'
      + '<p>총 이자 ' + won(interest) + '</p>'
      + '<p>원리금균등·고정 연이율 기준 참고 계산이며 실제 금융기관 상환예정표와 차이가 날 수 있습니다.</p>';
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    calculate();
  });
  form.addEventListener('input', calculate);
  calculate();
}());
