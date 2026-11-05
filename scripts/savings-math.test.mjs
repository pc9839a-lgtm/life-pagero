import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateSavings} from '../public/savings-math.js';

test('monthly beginning-of-month simple installment savings and standard tax',()=>{
  const r=calculateSavings({monthlyDeposit:500000,months:12,annualRate:3.5,taxRate:15.4});
  assert.equal(r.principal,6000000);
  assert.equal(r.interestBeforeTax,113750);
  assert.equal(r.estimatedTax,17518);
  assert.equal(r.interestAfterTax,96232);
  assert.equal(r.maturity,6096232);
  assert.equal(r.rows.length,12);
  assert.equal(r.rows[0].earningMonths,12);
  assert.equal(r.rows[11].earningMonths,1);
});
test('tax exempt savings returns entire pre-tax interest',()=>{
  const r=calculateSavings({monthlyDeposit:500000,months:12,annualRate:3.5,taxRate:0});
  assert.equal(r.estimatedTax,0);
  assert.equal(r.maturity,6113750);
});
test('zero interest cannot produce taxable income',()=>{
  const r=calculateSavings({monthlyDeposit:300000,months:24,annualRate:0});
  assert.equal(r.principal,7200000);
  assert.equal(r.interestBeforeTax,0);
  assert.equal(r.maturity,7200000);
});
test('single contribution earns one month',()=>{
  const r=calculateSavings({monthlyDeposit:100000,months:1,annualRate:12});
  assert.equal(r.interestBeforeTax,1000);
  assert.equal(r.maturity,100846);
});
test('equal contributions have greater interest with longer remaining term',()=>{
  const r=calculateSavings({monthlyDeposit:100000,months:12,annualRate:3.6});
  assert.equal(r.interestBeforeTax,23400);
  assert.ok(r.rows[0].estimatedInterest>r.rows[11].estimatedInterest);
});
test('invalid amounts, terms, rates or tax modes are rejected',()=>{
  for(const values of [
    {monthlyDeposit:0,months:12,annualRate:3},
    {monthlyDeposit:1e10,months:12,annualRate:3},
    {monthlyDeposit:100000,months:0,annualRate:3},
    {monthlyDeposit:100000,months:121,annualRate:3},
    {monthlyDeposit:100000,months:12.5,annualRate:3},
    {monthlyDeposit:100000,months:12,annualRate:-1},
    {monthlyDeposit:100000,months:12,annualRate:31},
    {monthlyDeposit:100000,months:12,annualRate:3,taxRate:101},
    {monthlyDeposit:'not-a-number',months:12,annualRate:3}
  ])assert.throws(()=>calculateSavings(values),RangeError);
});
