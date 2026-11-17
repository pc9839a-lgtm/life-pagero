import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const STAMP=path.resolve('content/seasonal-build-month.json');

export function seoulYearMonth(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'
  }).formatToParts(date);
  const year=parts.find(p=>p.type==='year')?.value;
  const month=parts.find(p=>p.type==='month')?.value;
  if(!/^\d{4}$/.test(year||'')||!/^(0[1-9]|1[0-2])$/.test(month||''))
    throw Error('[seasonal-refresh] Could not determine Asia/Seoul year/month');
  return year+'-'+month;
}

export function monthRefreshState(existing,date=new Date()){
  if(!existing || typeof existing!=='object' ||
    typeof existing.month!=='string' ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(existing.month))
    throw Error('[seasonal-refresh] Invalid tracked month stamp; do not silently overwrite');
  const current=seoulYearMonth(date);
  if(existing.month>current)throw Error('[seasonal-refresh] Refusing to roll the production stamp backward');
  return {changed:existing.month!==current,month:current,previous:existing.month};
}

function main(){
  const existing=JSON.parse(fs.readFileSync(STAMP,'utf8'));
  const state=monthRefreshState(existing);
  if(state.changed){
    fs.writeFileSync(STAMP,JSON.stringify({month:state.month},null,2)+'\n');
  }
  const result='changed='+(state.changed?'true':'false')+
    '\nmonth='+state.month+'\nprevious='+state.previous+'\n';
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,result);
  console.log('[seasonal-refresh] '+JSON.stringify(state));
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv[2]!=='--apply')throw Error('Specify --apply for an explicit stamp update');
  main();
}
