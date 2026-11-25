import test from 'node:test';
import assert from 'node:assert/strict';
import {compareDisabilityChildAllowance as compare} from '../public/disability-child-allowance-tool.js';

test('2026 official home-based allowance cases',()=>{
  assert.deepEqual([compare({grade:'severe',group:'livelihood',place:'home'}).monthly,
    compare({grade:'mild',group:'livelihood',place:'home'}).monthly,
    compare({grade:'severe',group:'housing',place:'home'}).monthly,
    compare({grade:'mild',group:'housing',place:'home'}).monthly],
    [220000,110000,170000,110000]);
});

test('2026 official facility cases',()=>{
  assert.equal(compare({grade:'severe',group:'livelihood',place:'facility'}).monthly,90000);
  assert.equal(compare({grade:'mild',group:'livelihood',place:'facility'}).monthly,30000);
});

test('12-month sum is only a reference sum; invalid combinations are not fabricated',()=>{
  const example=compare({grade:'severe',group:'livelihood',place:'home'});
  assert.equal(example.annual,2640000);
  const notDefined=compare({grade:'severe',group:'housing',place:'facility'});
  assert.equal(notDefined.valid,false);
  assert.equal(notDefined.monthly,null);
  assert.equal(notDefined.annual,null);
  assert.match(notDefined.reason,/주민센터/);
});

test('missing or unknown values never produce an amount',()=>{
 for(const item of [
  {grade:'',group:'livelihood',place:'home'},
  {grade:'mild',group:'',place:'facility'},
  {grade:'mild',group:'housing',place:''},
  {grade:'severe',group:'unknown',place:'home'}]){
   assert.equal(compare(item).valid,false);
   assert.equal(compare(item).monthly,null);
  }
});
