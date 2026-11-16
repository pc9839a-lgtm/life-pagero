import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {publicServiceReadiness} from './public-service-readiness.mjs';

const NOW = new Date('2026-11-16T01:00:00.000Z');
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'life-service-ready-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'dist','real-estate'),{recursive:true});
  fs.mkdirSync(path.join(root,'content'),{recursive:true});
  const write=(file,text)=>{
    const target=path.join(root,file);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,text);
  };
  return {root,write};
}
test('empty events and unapproved samples never enter the main navigation',t=>{
  const {root,write}=fixture(t);
  write('dist/events-data.json',JSON.stringify({events:[]}));
  write('content/real-estate.json',JSON.stringify({
    listings:[{approved:false,sample:true}]
  }));
  write('dist/real-estate/index.html','<meta name="robots" content="noindex,follow">');
  assert.deepEqual(publicServiceReadiness({root,now:NOW}),{
    events:false,realEstate:false
  });
});
test('only current source-backed events qualify',t=>{
  const {root,write}=fixture(t);
  write('dist/events-data.json',JSON.stringify({events:[
    {title:'종료된 행사',slug:'past',source:'tourapi',startDate:'2026-10-01',endDate:'2026-10-20'}
  ]}));
  assert.equal(publicServiceReadiness({root,now:NOW}).events,false);
  write('dist/events-data.json',JSON.stringify({events:[
    {title:'확인된 행사',slug:'current',source:'kopis',startDate:'2026-11-15',endDate:'2026-11-18'}
  ]}));
  assert.equal(publicServiceReadiness({root,now:NOW}).events,true);
});
test('real-estate listings require verified approval and an indexable directory',t=>{
  const {root,write}=fixture(t);
  write('content/real-estate.json',JSON.stringify({
    listings:[{approved:true,sample:false}]
  }));
  write('dist/real-estate/index.html','<meta name="robots" content="noindex,follow">');
  assert.equal(publicServiceReadiness({root,now:NOW}).realEstate,false);
  write('dist/real-estate/index.html','<meta name="robots" content="index,follow">');
  assert.equal(publicServiceReadiness({root,now:NOW}).realEstate,true);
  write('content/real-estate.json',JSON.stringify({
    listings:[{approved:true,sample:true}]
  }));
  assert.equal(publicServiceReadiness({root,now:NOW}).realEstate,false);
});
