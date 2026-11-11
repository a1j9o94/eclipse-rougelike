#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const baseUrl = process.env.BROWSER_BASE_URL;
const baseline = process.env.BROWSER_BASELINE;
if (!baseUrl || !baseline) {
  console.error(
    'Browser verification is incomplete: set BROWSER_BASE_URL to the candidate server and BROWSER_BASELINE to the independently captured baseline directory.',
  );
  process.exitCode = 1;
} else {
  const result = spawnSync(
    process.execPath,
    [
      'tools/maintainability-browser-check.mjs',
      '--base-url',
      baseUrl,
      '--output',
      process.env.BROWSER_OUTPUT || 'coding_agents/verification/browser',
      '--label',
      'candidate',
      '--baseline',
      baseline,
    ],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
