import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const valid = {
  VERCEL_ENV: 'production',
  CONVEX_DEPLOYMENT: 'dev:ideal-nightingale-55',
  VITE_CONVEX_URL: 'https://ideal-nightingale-55.convex.cloud',
  CONVEX_DEPLOY_KEY: 'dev:ideal-nightingale-55|fake-test-secret',
};
const run = (overrides = {}) => spawnSync(process.execPath,
  ['tools/check-convex-release.mjs'], { encoding: 'utf8', env: { ...valid, ...overrides } });

test('accepts only the established deployment with consistent selectors', () => {
  assert.equal(run().status, 0);
});

for (const [name, overrides] of [
  ['missing key', { CONVEX_DEPLOY_KEY: '' }],
  ['empty secret', { CONVEX_DEPLOY_KEY: 'dev:ideal-nightingale-55|' }],
  ['old production key', { CONVEX_DEPLOY_KEY: 'prod:greedy-mongoose-499|fake-test-secret' }],
  ['another development key', { CONVEX_DEPLOY_KEY: 'dev:another-deployment|fake-test-secret' }],
  ['preview key', { CONVEX_DEPLOY_KEY: 'preview:team:project|fake-test-secret' }],
  ['wrong frontend URL', { VITE_CONVEX_URL: 'https://greedy-mongoose-499.convex.cloud' }],
  ['wrong deployment selector', { CONVEX_DEPLOYMENT: 'prod:greedy-mongoose-499' }],
  ['preview environment', { VERCEL_ENV: 'preview' }],
]) {
  test(`rejects ${name} without disclosing credentials`, () => {
    const result = run(overrides);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Release blocked:/);
    assert.doesNotMatch(result.stdout + result.stderr, /fake-test-secret/);
  });
}
