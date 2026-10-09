import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';

// Exercise the actual publish entry point; an invalid selector must stop before network access.
for(const [name,overrides] of [['missing credentials',{CONVEX_DEPLOY_KEY:''}],['wrong deployment',{CONVEX_DEPLOYMENT:'prod:wrong-backend'}],['preview environment',{VERCEL_ENV:'preview'}]]){
 test(`backend release blocks ${name} before invoking Convex`,()=>{
  const env={...process.env,VERCEL_ENV:'production',CONVEX_DEPLOYMENT:'dev:ideal-nightingale-55',VITE_CONVEX_URL:'https://ideal-nightingale-55.convex.cloud',CONVEX_DEPLOY_KEY:'dev:ideal-nightingale-55|fake-release-secret',...overrides};
  const result=spawnSync('npm',['run','publish:vercel-backend'],{encoding:'utf8',env});
  assert.equal(result.status,1);assert.match(result.stderr,/Release blocked:/);
  assert.doesNotMatch(result.stdout+result.stderr,/Preparing Convex functions|fake-release-secret/);
 });
}
