import { calculateSavings } from './savings-math.js';

const form=document.querySelector('#savings-calculator-form');
if(form){
  const byId=id=>document.getElementById(id);
  const money=value=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(value)+'원';
  const value=id=>byId(id).value;
  const error=byId('savings-error');
  let last=null;

  const show=()=>{
    try{
      const result=calculateSavings({
        monthlyDeposit:value('savings-monthly'),
        months:value('savings-months'),
        annualRate:value('savings-rate'),
        taxRate:value('savings-tax')
      });
      error.hidden=true;
      error.textContent='';
      byId('savings-principal').textContent=money(result.principal);
      byId('savings-gross-interest').textContent=money(result.interestBeforeTax);
      byId('savings-tax-amount').textContent='−'+money(result.estimatedTax);
      byId('savings-net-interest').textContent=money(result.interestAfterTax);
      byId('savings-maturity').textContent=money(result.maturity);
      byId('savings-summary-terms').textContent=
        '매월 '+money(result.monthlyDeposit)+' · '+result.months+'개월 · 연 '+result.annualRate+'%';
      const rows=document.createDocumentFragment();
      for(const row of result.rows){
        const tr=document.createElement('tr');
        for(const text of [
          row.installment+'회',
          money(row.deposit),
          row.earningMonths+'개월',
          money(row.estimatedInterest)
        ]){
          const td=document.createElement('td');
          td.textContent=text;
          tr.appendChild(td);
        }
        rows.appendChild(tr);
      }
      byId('savings-schedule').replaceChildren(rows);
      last=result;
    }catch(e){
      last=null;
      error.hidden=false;
      error.textContent=e instanceof RangeError?e.message:'입력값을 확인하세요.';
      for(const id of ['savings-principal','savings-gross-interest',
        'savings-tax-amount','savings-net-interest','savings-maturity']){
        byId(id).textContent='—';
      }
      byId('savings-schedule').replaceChildren();
    }
  };
  const updatePresets=()=>{
    for(const button of form.querySelectorAll('[data-savings-preset]')){
      button.setAttribute('aria-pressed',
        String(Number(button.dataset.savingsPreset)===Number(value('savings-monthly'))));
    }
    for(const button of form.querySelectorAll('[data-savings-term]')){
      button.setAttribute('aria-pressed',
        String(Number(button.dataset.savingsTerm)===Number(value('savings-months'))));
    }
  };
  form.addEventListener('submit',event=>{event.preventDefault();show();});
  form.addEventListener('input',()=>{updatePresets();show();});
  form.addEventListener('change',()=>{updatePresets();show();});
  form.querySelectorAll('[data-savings-preset]').forEach(button=>{
    button.addEventListener('click',()=>{
      byId('savings-monthly').value=button.dataset.savingsPreset;
      updatePresets();show();
    });
  });
  form.querySelectorAll('[data-savings-term]').forEach(button=>{
    button.addEventListener('click',()=>{
      byId('savings-months').value=button.dataset.savingsTerm;
      updatePresets();show();
    });
  });
  const copy=byId('savings-copy');
  copy?.addEventListener('click',async()=>{
    if(!last)return;
    const lines=[
      '적금 만기 예상',
      '월 납입 '+money(last.monthlyDeposit),
      '기간 '+last.months+'개월',
      '연이율 '+last.annualRate+'%',
      '과세 '+last.taxRate+'%',
      '납입원금 '+money(last.principal),
      '세전이자 '+money(last.interestBeforeTax),
      '예상세금 '+money(last.estimatedTax),
      '세후이자 '+money(last.interestAfterTax),
      '예상만기수령액 '+money(last.maturity)
    ];
    try{
      if(!navigator.clipboard?.writeText)throw new Error('NO_CLIPBOARD');
      await navigator.clipboard.writeText(lines.join('\n'));
      copy.textContent='복사됨';
    }catch(_){copy.textContent='복사할 수 없음';}
  });
  updatePresets();
  show();
}
