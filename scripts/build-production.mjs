import { spawnSync } from 'node:child_process';

const canonicalSiteUrl = 'https://pagero.kr/life';
const configuredSiteUrl = (process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
if (configuredSiteUrl && configuredSiteUrl !== canonicalSiteUrl) {
  console.warn(`[seo] Ignoring obsolete PUBLIC_SITE_URL=${configuredSiteUrl}; production canonical is ${canonicalSiteUrl}`);
}
const env = {
  ...process.env,
  PUBLIC_SITE_URL: canonicalSiteUrl,
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  ['node', ['scripts/apply-content-updates.mjs']],
  ['node', ['scripts/curate-redundant-homepage-citations.mjs']],
  ['node', ['scripts/curate-published-primary-sources.mjs']],
  ['node', ['scripts/expand-editorial-depth.mjs']],
  ['node', ['scripts/apply-verified-rich-guides.mjs']],
  ['node', ['scripts/replace-duplicate-editorial-images.mjs']],
  [npm, ['run', 'validate:content']],
  ['node', ['scripts/build.mjs']],
  ['node', ['scripts/build-series.mjs']],
  ['node', ['scripts/polish-listings.mjs']],
  ['node', ['scripts/seo-finalize.mjs']],
  ['node', ['scripts/add-naver-verification.mjs']],
  ['node', ['scripts/adsense-readiness.mjs']],
  ['node', ['scripts/add-reader-decision-guides.mjs']],
  ['node', ['scripts/inject-tenping-ad.mjs']],
  ['node', ['scripts/inject-coupang-ad.mjs']],
  ['node', ['scripts/verify-editorial-depth.mjs']],
  ['node', ['scripts/remove-editorial-fluff.mjs']],
  ['node', ['scripts/build-portal.mjs']],
  ['node', ['scripts/enhance-finance.mjs']],
  ['node', ['scripts/redesign-life-ui.mjs']],
  ['node', ['scripts/compact-life-ui.mjs']],
  ['node', ['scripts/add-today-dashboard.mjs']],
  ['node', ['scripts/build-life-topics.mjs']],
  ['node', ['scripts/add-savings-calculator.mjs']],
  ['node', ['scripts/add-car-mortgage-calculators.mjs']],
  ['node', ['scripts/validate-build-output.mjs']],
  ['node', ['scripts/verify-finance-experience.mjs']],
  ['node', ['scripts/validate-modern-ui.mjs']],
  ['node', ['scripts/validate-compact-ui.mjs']],
  ['node', ['scripts/verify-today-dashboard.mjs']],
  ['node', ['scripts/verify-verified-rich-guides.mjs']],
  ['node', ['scripts/trim-life-ui-copy.mjs']],
  ['node', ['scripts/verify-trimmed-life-ui.mjs']],
  ['node', ['scripts/add-adpick-deals.mjs']],
  ['node', ['scripts/add-food-hub.mjs']],
  ['node', ['scripts/unify-global-navigation.mjs']],
  ['node', ['scripts/verify-global-navigation.mjs']],
  ['node', ['scripts/verify-sitewide-clean-ui.mjs']],
  ['node', ['scripts/build-editorial-life.mjs']],
  ['node', ['scripts/verify-editorial-life.mjs']],
  ['node', ['scripts/verify-mobile-finance-rates.mjs']],
  ['node', ['scripts/verify-savings-calculator.mjs']],
  ['node', ['scripts/verify-car-mortgage-calculators.mjs']],
  ['node', ['scripts/verify-adpick-deals.mjs']],
  ['node', ['scripts/verify-food-hub.mjs']],
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
