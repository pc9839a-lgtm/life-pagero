import { spawnSync } from 'node:child_process';

const canonicalSiteUrl = process.env.PUBLIC_SITE_URL || 'https://pagero.kr/life';
const env = {
  ...process.env,
  PUBLIC_SITE_URL: canonicalSiteUrl,
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  ['node', ['scripts/apply-content-updates.mjs']],
  [npm, ['run', 'validate:content']],
  ['node', ['scripts/build.mjs']],
  ['node', ['scripts/build-series.mjs']],
  ['node', ['scripts/polish-listings.mjs']],
  ['node', ['scripts/seo-finalize.mjs']],
  ['node', ['scripts/add-naver-verification.mjs']],
  ['node', ['scripts/adsense-readiness.mjs']],
  ['node', ['scripts/validate-build-output.mjs']],
];

console.log(`[build] PUBLIC_SITE_URL=${canonicalSiteUrl}`);

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
