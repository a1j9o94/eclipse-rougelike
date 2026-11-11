import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverTests, validateRunReport, positiveInteger } from './run-tests-batched.mjs';

test('discovers colocated and external tests, classifies node tests, and excludes generated assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'eclipse-inventory-'));
  try {
    for (const file of [
      'src/__tests__/first.test.ts',
      'src/feature/second.spec.tsx',
      'shared/rules.test.ts',
      'tools/nested/check.test.mjs',
      'node_modules/lib/skip.test.js',
      'dist/skip.test.js',
      'convex/_generated/skip.test.ts',
      'public/assets/skip.test.js',
      '.second-dawn/skip.test.ts',
    ]) {
      await mkdir(join(root, file, '..'), { recursive: true });
      await writeFile(join(root, file), '');
    }
    assert.deepEqual(discoverTests(root), {
      vitest: [
        'shared/rules.test.ts',
        'src/__tests__/first.test.ts',
        'src/feature/second.spec.tsx',
      ],
      node: ['tools/nested/check.test.mjs'],
      browser: [],
      python: [],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects empty, skipped, missing, and unexpected test execution', () => {
  const result = (name, status = 'passed') => ({
    name: `/repo/${name}`,
    status,
    assertionResults: [{ status: 'passed' }],
  });
  assert.throws(() => validateRunReport([], { testResults: [] }, '/repo'), /empty/);
  assert.throws(() => validateRunReport(['a.test.ts'], { testResults: [] }, '/repo'), /missing/);
  assert.throws(
    () =>
      validateRunReport(['a.test.ts'], { testResults: [result('a.test.ts', 'skipped')] }, '/repo'),
    /skipped/,
  );
  assert.throws(
    () =>
      validateRunReport(
        ['a.test.ts'],
        { testResults: [result('a.test.ts'), result('b.test.ts')] },
        '/repo',
      ),
    /unexpected/,
  );
  assert.throws(
    () =>
      validateRunReport(
        ['a.test.ts'],
        { testResults: [{ ...result('a.test.ts'), assertionResults: [{ status: 'pending' }] }] },
        '/repo',
      ),
    /skipped/,
  );
  assert.deepEqual(
    validateRunReport(['a.test.ts'], { testResults: [result('a.test.ts')] }, '/repo'),
    { files: 1, assertions: 1, skipped: 0 },
  );
});

test('batch size and workers must be positive integers', () => {
  for (const value of ['0', '-1', 'NaN', '1.5'])
    assert.throws(() => positiveInteger(value, 'batch size'), /positive integer/);
  assert.equal(positiveInteger('20', 'batch size'), 20);
});
