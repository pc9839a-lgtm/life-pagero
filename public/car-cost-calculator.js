import { calculateCarCost } from './car-cost-math.js';

const form=document.getElementById('car-cost-form');
if(form){
  const byId=id=>document.getElementById(id);
  const won=n=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(n)+'원';
  const fields=['annualKm','unitPrice','efficiency','insuranceYear','carTaxYear',
    'parkingMonth','tollMonth','washingMonth','maintenanceYear','inspectionYear',
    'tiresYear','depreciationYear','loanMonthly'];
  const names={
    petrol:['연비 (km/L)','주유 단가 (원/L)'],
    diesel:['연비 (km/L)','주유 단가 (원/L)'],
    lpg:['연비 (km/L)','주유 단가 (원/L)'],
    electric:['전비 (km/kWh)','충전 단가 (원/kWh)'],
    hybrid:['연비 (km/L)','주유 단가 (원/L)']
  };
  const updateFuel=()=>{
    const type=byId('car-fuel').value;
    const [eff,price]=names[type]||names.petrol;
    byId('car-efficiency-label').textContent=eff;
    byId('car-unit-label').textContent=price;
    byId('car-unit-price').setAttribute('aria-label',price);
    byId('car-efficiency').setAttribute('aria-label',eff);
  };
  const render=()=>{
    try{
      const input=Object.fromEntries(fields.map(k=>
        [k,byId('car-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())).value]));
      const out=calculateCarCost(input);
      byId('car-cost-error').hidden=true;
      byId('car-cost-error').textContent='';
      byId('car-cost-monthly').textContent=won(out.monthly);
      byId('car-cost-annual').textContent=won(out.annual);
      byId('car-cost-per-km').textContent=won(out.perKm);
      byId('car-cost-fuel-total').textContent=won(out.energyYear);
      const tbody=document.createDocumentFragment();
      for(const row of out.breakdown){
        const tr=document.createElement('tr');
        const label=document.createElement('th');label.scope='row';label.textContent=row.label;
        const monthly=document.createElement('td');monthly.textContent=won(Math.round(row.annual/12));
        const year=document.createElement('td');year.textContent=won(row.annual);
        tr.append(label,monthly,year);tbody.append(tr);
      }
      byId('car-cost-breakdown').replaceChildren(tbody);
    }catch(e){
      byId('car-cost-error').hidden=false;
      byId('car-cost-error').textContent=e instanceof RangeError?e.message:'금액과 주행거리를 확인하세요.';
      for(const id of ['car-cost-monthly','car-cost-annual','car-cost-per-km','car-cost-fuel-total'])
        byId(id).textContent='—';
      byId('car-cost-breakdown').replaceChildren();
    }
  };
  form.addEventListener('submit',event=>{event.preventDefault();render();});
  form.addEventListener('input',render);
  form.addEventListener('change',()=>{
    updateFuel();render();
  });
  updateFuel();render();
}
