import {calculateMortgage,mortgagePreset} from './mortgage-math.js';
const form=document.getElementById('mortgage-form');
if(form){
  const byId=id=>document.getElementById(id);
  const read=id=>byId('mortgage-'+id).value;
  const write=(id,value)=>{byId('mortgage-'+id).value=String(value);};
  const wonFromMan=n=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(n)+'만원';
  const won=n=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(n)+'원';
  const values=['homePrice','annualIncome','existingDebtAnnual','cashAvailable',
    'ltv','dsr','rate','stress','years','collateralDeduction','regulatoryCap'];
  const fields=Object.fromEntries(values.map(key=>[key,
    'mortgage-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())]));
  const presets=()=>{
    const area=read('area');
    const first=byId('mortgage-first-home').checked;
    const price=Number(byId(fields.homePrice).value);
    if(!Number.isFinite(price)||price<1000)return;
    const preset=mortgagePreset(area,first,price);
    write('ltv',preset.ltv);
    write('stress',preset.stress);
    write('regulatory-cap',preset.cap);
  };
  const render=()=>{
    try{
      const input=Object.fromEntries(values.map(key=>[key,byId(fields[key]).value]));
      const result=calculateMortgage(input);
      byId('mortgage-error').hidden=true;
      byId('mortgage-error').textContent='';
      byId('mortgage-limit').textContent=wonFromMan(result.maxLoan);
      byId('mortgage-monthly').textContent=won(result.monthlyWon);
      byId('mortgage-required-cash').textContent=wonFromMan(result.requiredCash);
      byId('mortgage-shortfall').textContent=wonFromMan(result.cashShortfall);
      byId('mortgage-total-interest').textContent=wonFromMan(result.totalInterest);
      byId('mortgage-ltv-limit').textContent=wonFromMan(result.ltvLimit);
      byId('mortgage-dsr-limit').textContent=wonFromMan(result.dsrLimit);
      byId('mortgage-cap-limit').textContent=result.capLimit===Infinity?'상한 미설정':wonFromMan(result.capLimit);
      byId('mortgage-stress-rate').textContent=(result.rate+result.stress).toFixed(2)+'%';
      const reason=byId('mortgage-limit-reason');
      const labels={ltv:'LTV 기준',dsr:'DSR 기준',cap:'주택가격별 상한',insufficient:'상환 여력 부족'};
      reason.textContent='한도 결정 요인: '+labels[result.limitReason];
      const cashNote=byId('mortgage-cash-note');
      cashNote.textContent='주택가격 대비 필요 자기자금이며 취득세·중개수수료·등기 비용 등 별도입니다.';
    }catch(e){
      byId('mortgage-error').hidden=false;
      byId('mortgage-error').textContent=e instanceof RangeError?e.message:'입력값을 확인하세요.';
      for(const id of ['mortgage-limit','mortgage-monthly','mortgage-required-cash',
        'mortgage-shortfall','mortgage-total-interest','mortgage-ltv-limit',
        'mortgage-dsr-limit','mortgage-cap-limit','mortgage-stress-rate']){
        byId(id).textContent='—';
      }
      byId('mortgage-limit-reason').textContent='';
    }
  };
  byId('mortgage-area').addEventListener('change',()=>{presets();render();});
  byId('mortgage-first-home').addEventListener('change',()=>{presets();render();});
  byId('mortgage-home-price').addEventListener('input',()=>{
    const price=Number(read('home-price'));
    if(Number.isFinite(price)&&price>=1000){
      const p=mortgagePreset(read('area'),byId('mortgage-first-home').checked,price);
      write('regulatory-cap',p.cap);
    }
    render();
  });
  form.addEventListener('submit',event=>{event.preventDefault();render();});
  form.addEventListener('input',render);
  form.addEventListener('change',render);
  presets();render();
}
