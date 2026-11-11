import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('only Vercel production builds may publish the backend', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eclipse-build-'));
  try {
    await mkdir(join(dir, 'bin'));
    await writeFile(
      join(dir, 'bin', 'npm'),
      '#!/bin/sh\nprintf "%s\\n" "$*" > "$BUILD_TEST_LOG"\n',
      { mode: 0o755 },
    );
    for (const environment of ['preview', 'development', '', 'production']) {
      const log = join(dir, 'command');
      const result = spawnSync(process.execPath, [resolve('tools/build-vercel.mjs')], {
        env: {
          ...process.env,
          PATH: join(dir, 'bin'),
          BUILD_TEST_LOG: log,
          VERCEL_ENV: environment,
        },
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        (await readFile(log, 'utf8')).trim(),
        environment === 'production' ? 'run build:release' : 'run build:frontend',
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
