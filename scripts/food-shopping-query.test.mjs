import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('public/life-food.js','utf8');
const recipeMatch=source.match(/const recipeRows=(\[[^\r\n]+\]);/);
assert.ok(recipeMatch,'Published food recipes missing');
const recipeRows=JSON.parse(recipeMatch[1]);
const helper=source.match(/const basketSearchNames=Object\.freeze\((\{[^\n]+\})\);\nconst basketSearchQuery=name=>\{[\s\S]*?\n\};/);
assert.ok(helper,'Published grocery-search query normalization missing');
const {basketSearchNames,basketSearchQuery}=vm.runInNewContext(
  '(()=>{'+helper[0]+';return {basketSearchNames,basketSearchQuery};})()',
  Object.create(null),{timeout:250}
);
const uniqueIngredients=[...new Set(recipeRows.flatMap(row=>row[1].map(item=>item[0])))];

test('every currently published ingredient links to an accepted 2–40-character shopping query',()=>{
  assert.ok(uniqueIngredients.length>=50);
  for(const ingredient of uniqueIngredients){
    const query=basketSearchQuery(ingredient);
    assert.ok(query.length>=2&&query.length<=40,ingredient+': '+query);
    assert.ok(!/^\s|\s$/.test(query),ingredient+' had whitespace in shopping query');
  }
});

test('all seven one-character grocery items use meaningful search keywords',()=>{
  const expected={
    '무':'국산 무','물':'생수','귤':'감귤','쑥':'국산 쑥',
    '쌀':'백미 쌀','배':'신고배','굴':'생굴'
  };
  for(const [name,query] of Object.entries(expected)){
    assert.ok(uniqueIngredients.includes(name),'Ingredient disappeared: '+name);
    assert.equal(basketSearchNames[name],query);
    assert.equal(basketSearchQuery(name),query);
  }
});

test('existing stored groceries keep their original labels and regular terms unchanged',()=>{
  assert.equal(basketSearchQuery('  무  '),'국산 무');
  assert.equal(basketSearchQuery('다진 마늘'),'다진 마늘');
  assert.equal(basketSearchQuery('두부'),'두부');
  assert.equal(basketSearchQuery('말린 쌀'), '말린 쌀');
  assert.equal(basketSearchQuery('가'.repeat(60)).length,40);
});

test('grocery UI actually uses the normalized search term instead of raw one-character name',()=>{
  assert.match(source,/search\.href=prefix\+'deals\/\?q='\+encodeURIComponent\(basketSearchQuery\(x\.name\)\)\+'&src=food'/);
  assert.match(source,/x\.name\.trim\(\)\.length>0/);
});
