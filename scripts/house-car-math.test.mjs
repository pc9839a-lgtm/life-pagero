import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCarCost} from '../public/car-cost-math.js';
import {calculateMortgage,mortgagePreset,monthlyAnnuity,maxPrincipalFromPayment}
  from '../public/mortgage-math.js';

const car={annualKm:12000,unitPrice:1700,efficiency:16,
  insuranceYear:850000,carTaxYear:280000,parkingMonth:40000,
  tollMonth:30000,washingMonth:10000,maintenanceYear:300000,
  inspectionYear:50000,tiresYear:100000,depreciationYear:0,loanMonthly:0};

test('vehicle expected fuel cost, annual cost, monthly cost and per-km',()=>{
  const result=calculateCarCost(car);
  assert.equal(result.energyYear,1275000);
  assert.equal(result.annual,3815000);
  assert.equal(result.monthly,317917);
  assert.equal(result.perKm,318);
  assert.equal(result.breakdown.length,11);
});
test('vehicle EV uses km/kWh and does not automatically guess live charging price',()=>{
  const result=calculateCarCost({...car,annualKm:10000,efficiency:5,
    unitPrice:300,insuranceYear:0,carTaxYear:0,parkingMonth:0,
    tollMonth:0,washingMonth:0,maintenanceYear:0,inspectionYear:0,
    tiresYear:0,depreciationYear:0,loanMonthly:0});
  assert.equal(result.energyYear,600000);
  assert.equal(result.monthly,50000);
});
test('vehicle unknown zero costs valid; negative/missing efficiency invalid',()=>{
  const base={...car};
  for(const key of ['annualKm','unitPrice','insuranceYear'])
    assert.throws(()=>calculateCarCost({...base,[key]:-1}),RangeError);
  assert.throws(()=>calculateCarCost({...base,efficiency:0}),RangeError);
  assert.throws(()=>calculateCarCost({...base,annualKm:201000}),RangeError);
});
test('regulatory price caps across metropolitan price bands',()=>{
  assert.deepEqual(mortgagePreset('regulated',false,40000),
    {ltv:40,stress:3,cap:60000});
  assert.deepEqual(mortgagePreset('regulated',true,40000),
    {ltv:70,stress:3,cap:60000});
  assert.deepEqual(mortgagePreset('metro',false,150001),
    {ltv:70,stress:3,cap:40000});
  assert.deepEqual(mortgagePreset('metro',false,250001),
    {ltv:70,stress:3,cap:20000});
  assert.deepEqual(mortgagePreset('regional',true,40000),
    {ltv:80,stress:0.75,cap:0});
});
const mortgage={homePrice:40000,annualIncome:20000,
  existingDebtAnnual:0,cashAvailable:5000,
  ltv:70,dsr:40,rate:4.5,stress:3,years:30,
  collateralDeduction:0,regulatoryCap:60000};
test('mortgage LTV binds when income has ample margin',()=>{
  const x=calculateMortgage(mortgage);
  assert.equal(x.maxLoan,28000);
  assert.equal(x.ltvLimit,28000);
  assert.equal(x.limitReason,'ltv');
  assert.equal(x.requiredCash,12000);
  assert.equal(x.cashShortfall,7000);
  assert.ok(x.monthlyWon>0);
  assert.ok(x.totalInterest>0);
  assert.ok(x.stressMonthlyWon>x.monthlyWon);
});
test('mortgage DSR blocks a purchase when existing annual debt uses repayment margin',()=>{
  const x=calculateMortgage({...mortgage,annualIncome:2000,
    existingDebtAnnual:1000});
  assert.equal(x.maxLoan,0);
  assert.equal(x.monthlyWon,0);
  assert.equal(x.limitReason,'insufficient');
});
test('mortgage price band ceiling applies independently',()=>{
  const x=calculateMortgage({...mortgage,homePrice:300000,
    annualIncome:100000,regulatoryCap:20000});
  assert.equal(x.capLimit,20000);
  assert.equal(x.maxLoan,20000);
  assert.equal(x.limitReason,'cap');
});
test('mortgage stress applies only to DSR, not charged amortization',()=>{
  const stressed=calculateMortgage({...mortgage,annualIncome:5000,stress:3});
  const neutral=calculateMortgage({...mortgage,annualIncome:5000,stress:0});
  assert.ok(stressed.dsrLimit<neutral.dsrLimit);
  assert.equal(stressed.monthlyWon,
    Math.round(monthlyAnnuity(stressed.maxLoan*10000,stressed.rate,stressed.years)));
});
test('mortgage zero-interest math is safe, repayment inverse is consistent',()=>{
  assert.equal(monthlyAnnuity(12000000,0,1),1000000);
  assert.equal(maxPrincipalFromPayment(1000000,0,1),12000000);
  const payment=monthlyAnnuity(250000000,4.25,30);
  assert.ok(Math.abs(maxPrincipalFromPayment(payment,4.25,30)-250000000)<2);
});
test('mortgage rejects invalid input and prevents negative limits',()=>{
  assert.throws(()=>calculateMortgage({...mortgage,homePrice:-1}),RangeError);
  assert.throws(()=>calculateMortgage({...mortgage,ltv:101}),RangeError);
  assert.throws(()=>calculateMortgage({...mortgage,dsr:-1}),RangeError);
  assert.throws(()=>calculateMortgage({...mortgage,years:0}),RangeError);
  assert.throws(()=>mortgagePreset('unknown',false,40000),RangeError);
});
