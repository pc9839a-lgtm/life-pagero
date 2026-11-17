import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seoulMonth,monthlyInitialRows} from './food-seasonal-default.mjs';

const source=fs.readFileSync('public/life-food.js','utf8');

test('Seoul calendar month, not GitHub runner UTC, sets the initial seasonal page',()=>{
  assert.equal(seoulMonth(new Date('2026-11-30T14:59:59.000Z')),11);
  assert.equal(seoulMonth(new Date('2026-11-30T15:00:00.000Z')),12);
  assert.equal(seoulMonth(new Date('2026-12-31T14:59:59.000Z')),12);
  assert.equal(seoulMonth(new Date('2026-12-31T15:00:00.000Z')),1);
});

test('all months are backed by the exact same authored client recipe catalogue',()=>{
  for(let month=1;month<=12;month++){
    const rows=monthlyInitialRows(source,month);
    assert.ok(rows.length>=3);
    assert.equal(new Set(rows.map(row=>row.name)).size,rows.length);
    for(const row of rows){
      assert.ok(row.recipe.length>=2);
      assert.ok(row.method.length>=15,month+' '+row.recipe);
      assert.ok(row.keep.length>=4);
      assert.ok(row.query.length>=2);
    }
  }
  const november=monthlyInitialRows(source,11);
  assert.deepEqual(november.map(x=>x.name),[
    '삼치','가리비','가을무','배추','단감','고구마'
  ]);
  assert.equal(monthlyInitialRows(source,12)[0].name,'굴');
});

test('invalid date, broken catalogue and incomplete recipes fail closed',()=>{
  assert.throws(()=>monthlyInitialRows(source,0),/Month must/);
  assert.throws(()=>monthlyInitialRows(source,13),/Month must/);
  assert.throws(()=>monthlyInitialRows('const monthly={};',11),/source was changed/);
  assert.throws(()=>monthlyInitialRows(source.replace('const recipeRows=', 'const recipesRemoved='),11),
    /source was changed/);
});
