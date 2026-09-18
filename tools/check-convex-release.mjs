// This live site intentionally uses the existing development deployment.
// A deploy key overrides CONVEX_DEPLOYMENT in the CLI, so validate all selectors
// before invoking Convex. Never print the supplied key, including on failure.
const deployment = 'dev:ideal-nightingale-55';
const url = 'https://ideal-nightingale-55.convex.cloud';
const key = process.env.CONVEX_DEPLOY_KEY ?? '';
const problems = [];

if (process.env.VERCEL_ENV !== 'production') {
  problems.push('Backend publishing is restricted to Vercel Production builds.');
}
if (process.env.CONVEX_DEPLOYMENT !== deployment) {
  problems.push(`Set CONVEX_DEPLOYMENT to ${deployment}.`);
}
if (process.env.VITE_CONVEX_URL !== url) {
  problems.push(`Set VITE_CONVEX_URL to ${url}.`);
}
if (!key.startsWith(`${deployment}|`) || !key.slice(deployment.length + 1).trim()) {
  problems.push(`Set CONVEX_DEPLOY_KEY to a development deploy key for ${deployment}.`);
}

if (problems.length) {
  console.error(`Release blocked: ${problems.join(' ')}`);
  process.exitCode = 1;
} else {
  console.log(`Release target verified: ${deployment}.`);
}
