import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seoulYearMonth,monthRefreshState} from './seasonal-month-refresh.mjs';

test('Korea calendar month switches at midnight KST, not UTC midnight',()=>{
  assert.equal(seoulYearMonth(new Date('2026-11-30T14:59:59.000Z')),'2026-11');
  assert.equal(seoulYearMonth(new Date('2026-11-30T15:00:00.000Z')),'2026-12');
  assert.equal(seoulYearMonth(new Date('2026-12-31T14:59:59.000Z')),'2026-12');
  assert.equal(seoulYearMonth(new Date('2026-12-31T15:00:00.000Z')),'2027-01');
  assert.equal(seoulYearMonth(new Date('2028-02-29T15:00:00.000Z')),'2028-03');
});

test('same Seoul month skips deploys and future month changes exactly once',()=>{
  const saved={month:'2026-11'};
  assert.deepEqual(monthRefreshState(saved,new Date('2026-11-17T11:27:00.000Z')),
    {changed:false,month:'2026-11',previous:'2026-11'});
  assert.deepEqual(monthRefreshState(saved,new Date('2026-11-30T15:01:00.000Z')),
    {changed:true,month:'2026-12',previous:'2026-11'});
  assert.equal(monthRefreshState({month:'2026-12'},
    new Date('2026-12-15T04:00:00.000Z')).changed,false);
});

test('future stamps cannot be rolled backwards by runner timezone or clock errors',()=>{
  assert.throws(()=>monthRefreshState({month:'2026-12'},
    new Date('2026-11-17T11:27:00Z')),/Refusing to roll/);
});

test('missing, malformed or impossible production stamp fails closed',()=>{
  for(const invalid of [{},null,{month:''},{month:'2026-00'},
    {month:'2026-13'},{month:'Nov 2026'},{month:202611}]){
    assert.throws(()=>monthRefreshState(invalid),/Invalid tracked month/);
  }
});

test('monthly deployment and full SHA verification are explicitly chained',()=>{
  const action=fs.readFileSync('.github/workflows/life-seasonal-month-refresh.yml','utf8');
  const qa=fs.readFileSync('.github/workflows/life-seo-quality.yml','utf8');
  const builder=fs.readFileSync('scripts/add-food-hub.mjs','utf8');
  const verifier=fs.readFileSync('scripts/verify-food-hub.mjs','utf8');
  assert.match(action,/cron: '23 16 \* \* \*'/);
  assert.match(action,/node scripts\/seasonal-month-refresh.mjs --apply/);
  assert.match(action,/if: steps\.month\.outputs\.changed == 'true'/);
  assert.match(action,/npm run check[\s\S]*?npm run build/);
  assert.match(action,/git push origin HEAD:main/);
  assert.match(action,/gh workflow run life-seo-quality.yml --ref main -f seasonal_refresh=true/);
  assert.match(qa,/seasonal_refresh:/);
  assert.match(qa,/inputs\.seasonal_refresh == true/);
  assert.match(qa,/postdeploy-browser:/);
  assert.match(builder,/'식재료 보관법',currentMonth\+'월 제철음식'/);
  assert.doesNotMatch(builder,/'식재료 보관법','11월 제철음식'/);
  assert.doesNotMatch(verifier,/page\.includes\('삼치'\)&&page\.includes\('가리비'\)/);
  const stamp=JSON.parse(fs.readFileSync('content/seasonal-build-month.json','utf8'));
  assert.match(stamp.month,/^\d{4}-(0[1-9]|1[0-2])$/);
});

test('monthly release waits for successful QA of the exact committed SHA',()=>{
  const monthly=fs.readFileSync('.github/workflows/life-seasonal-month-refresh.yml','utf8');
  const qa=fs.readFileSync('.github/workflows/life-seo-quality.yml','utf8');
  assert.match(monthly,/timeout-minutes: 60/);
  assert.match(monthly,/monthly_sha="\$\(git rev-parse HEAD\)"/);
  assert.match(monthly,/seasonal_expected_sha="\$monthly_sha"/);
  assert.match(monthly,/--event workflow_dispatch --branch main/);
  assert.match(monthly,/\.headSha == \$sha and \.createdAt >= \$after/);
  assert.match(monthly,/gh run watch "\$run_id" --exit-status/);
  assert.match(qa,/seasonal_expected_sha:/);
  assert.match(qa,/test -n "\$MONTHLY_EXPECTED_SHA"/);
  assert.match(qa,/test "\$MONTHLY_EXPECTED_SHA" = "\$GITHUB_SHA"/);
});
