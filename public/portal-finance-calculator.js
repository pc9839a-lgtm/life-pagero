import { loanSchedule } from './finance-loan-math.mjs';

const form = document.getElementById('portal-loan-form');
const results = document.getElementById('portal-loan-result');
const scheduleEl = document.getElementById('loan-schedule-table');
const compareEl = document.getElementById('loan-method-comparison');
const exportButton = document.getElementById('loan-export');
const toggleButton = document.getElementById('loan-schedule-toggle');
const nfmt = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const won = n => nfmt.format(Math.round(n)) + '원';
const wonRaw = n => nfmt.format(Math.round(n));
const methods = {
  'equal-payment': '원리금균등',
  'equal-principal': '원금균등',
  'bullet': '만기일시'
};
let latest = null;
let showAll = false;
function numberOf(id) {
  const element = document.getElementById(id);
  return element?.value === '' ? NaN : Number(element?.value);
}
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
function rowText(row) {
  return '<tr><th scope="row">' + row.month + '</th><td>' + wonRaw(row.payment)
    + '</td><td>' + wonRaw(row.principal) + '</td><td>' + wonRaw(row.interest)
    + '</td><td>' + wonRaw(row.balance) + '</td></tr>';
}
function render() {
  if (!form || !results) return;
  const method = form.querySelector('input[name="loan-method"]:checked')?.value || 'equal-payment';
  const input = {
    principal: numberOf('loan-principal'),
    annualRate: numberOf('loan-rate'),
    months: numberOf('loan-months'),
    graceMonths: numberOf('loan-grace'),
    extraMonthly: numberOf('loan-extra'),
    method
  };
  try {
    latest = loanSchedule(input);
    form.querySelectorAll('[data-method-value]').forEach(element => {
      element.classList.toggle('is-active', element.dataset.methodValue === method);
    });
    results.innerHTML = '<div class="loan-result-heading"><h2>계산 결과</h2><span>'
      + methods[method] + ' · ' + latest.paidOffMonths + '개월 상환</span></div>'
      + '<div class="loan-result-primary"><span>첫 달 예상 납입액</span><strong>'
      + won(latest.firstPayment) + '</strong></div>'
      + '<div class="loan-result-grid"><div><span>마지막 달 납입액</span><strong>'
      + won(latest.lastPayment) + '</strong></div><div><span>총 이자</span><strong>'
      + won(latest.totalInterest) + '</strong></div><div><span>원금 + 총이자</span><strong>'
      + won(latest.totalPaid) + '</strong></div><div><span>최대 월 납입액</span><strong>'
      + won(latest.maxPayment) + '</strong></div></div>'
      + '<p class="loan-result-note">고정 연이율, 매월 말 납부, 월 복리 환산에 따른 참고 계산입니다. 실제 은행 일할이자·수수료·중도상환수수료는 다를 수 있습니다.</p>';
    const comparison = Object.entries(methods).map(([key, name]) => {
      const row = key === method ? latest : loanSchedule({ ...input, method: key });
      return '<tr' + (key === method ? ' class="loan-selected-method"' : '')
        + '><th scope="row">' + escape(name) + '</th><td>' + wonRaw(row.firstPayment)
        + '</td><td>' + wonRaw(row.totalInterest) + '</td><td>' + row.paidOffMonths
        + '개월</td></tr>';
    });
    compareEl.innerHTML = comparison.join('');
    const visibleRows = showAll ? latest.rows : latest.rows.slice(0, 12);
    scheduleEl.innerHTML = visibleRows.map(rowText).join('');
    toggleButton.hidden = latest.rows.length <= 12;
    toggleButton.textContent = showAll ? '처음 12개월만 보기'
      : '전체 ' + latest.rows.length + '개월 보기';
    exportButton.disabled = false;
  } catch (error) {
    latest = null;
    results.innerHTML = '<div role="alert" class="loan-validation-error">'
      + escape(error.message || '입력값을 다시 확인하세요.') + '</div>';
    scheduleEl.innerHTML = '';
    compareEl.innerHTML = '';
    exportButton.disabled = true;
    toggleButton.hidden = true;
  }
}
if (form) {
  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.querySelectorAll('[data-fill]').forEach(button => {
    button.addEventListener('click', () => {
      const field = document.getElementById(button.dataset.field);
      const increment = Number(button.dataset.fill);
      field.value = Math.min(Number(field.max || Infinity),
        Math.max(Number(field.min || 0), (Number(field.value) || 0) + increment));
      render();
    });
  });
  toggleButton?.addEventListener('click', () => { showAll = !showAll; render(); });
  exportButton?.addEventListener('click', () => {
    if (!latest) return;
    const header = '회차,월 납입액(원),원금(원),이자(원),잔여원금(원)\r\n';
    const rows = latest.rows.map(row => [
      row.month, Math.round(row.payment), Math.round(row.principal),
      Math.round(row.interest), Math.round(row.balance)
    ].join(',')).join('\r\n');
    const csv = '\uFEFF' + header + rows + '\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '대출상환표_' + methods[latest.method] + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });
  render();
}
