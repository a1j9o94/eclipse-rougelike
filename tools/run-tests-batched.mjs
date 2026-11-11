#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const excludedDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'assets',
  'public',
  '_generated',
  '.second-dawn',
  'test-results',
  'playwright-report',
]);
const testFile = /\.(test|spec)\.[cm]?[tj]sx?$/;

/** Inventory the entire source tree, not just the conventional __tests__ folder. */
export function discoverTests(root) {
  const inventory = { vitest: [], node: [], browser: [], python: [] };
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) walk(absolute);
      } else if (entry.isFile()) {
        const file = relative(root, absolute).split('\\').join('/');
        if (/\.(test|spec)\.py$/.test(file)) {
          inventory.python.push(file);
        } else if (testFile.test(file)) {
          inventory[file.startsWith('tools/') && file.endsWith('.mjs') ? 'node' : 'vitest'].push(
            file,
          );
        } else if (
          file.startsWith('tools/') &&
          /\.[cm]?js$/.test(file) &&
          /(?:from\s+['"]playwright|import\(['"]playwright)/.test(readFileSync(absolute, 'utf8'))
        ) {
          inventory.browser.push(file);
        }
      }
    }
  }
  walk(root);
  for (const files of Object.values(inventory)) files.sort();
  return inventory;
}

export function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${label} must be a positive integer`);
  return parsed;
}

/** A zero exit code alone does not prove that every requested test actually ran. */
export function validateRunReport(expected, report, root) {
  if (!expected.length) throw new Error('Test selection is empty');
  const results = report.testResults ?? [];
  const seen = new Set();
  let assertions = 0;
  for (const result of results) {
    const file = relative(root, result.name).split('\\').join('/');
    if (!expected.includes(file) || seen.has(file))
      throw new Error(`unexpected test result: ${file}`);
    seen.add(file);
    if (result.status !== 'passed') throw new Error(`failed or skipped test file: ${file}`);
    if (!result.assertionResults?.length) throw new Error(`empty test file: ${file}`);
    for (const assertion of result.assertionResults) {
      if (assertion.status !== 'passed') throw new Error(`failed or skipped assertion: ${file}`);
      assertions++;
    }
  }
  const missing = expected.filter((file) => !seen.has(file));
  if (missing.length) throw new Error(`missing test results: ${missing.join(', ')}`);
  return { files: seen.size, assertions, skipped: 0 };
}

const smokeFiles = [
  'second_dawn_exploration_shared_map.spec.tsx',
  'second_dawn_build_move_confirmation.spec.tsx',
  'second_dawn_research_workspace.spec.tsx',
  'second_dawn_native_dialog.spec.tsx',
  'second_dawn_turn_attention_board.spec.tsx',
  'second_dawn_queue_submission.spec.tsx',
  'second_dawn_action_drafts.spec.tsx',
  'second_dawn_fixed_fit.spec.tsx',
].map((file) => `src/__tests__/${file}`);

async function main() {
  const root = process.cwd();
  const inventory = discoverTests(root);
  const evidence = join(root, 'coding_agents', 'verification');
  mkdirSync(evidence, { recursive: true });
  writeFileSync(join(evidence, 'test-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
  console.log(
    `Discovered ${inventory.vitest.length} Vitest files, ${inventory.node.length} Node files, ${inventory.browser.length} browser scripts.`,
  );
  if (process.argv.includes('--inventory')) return;
  if (process.argv.includes('--python')) {
    if (!inventory.python.length) throw new Error('Python test selection is empty');
    const summary = {
      discovered: inventory.python.length,
      executed: 0,
      assertions: 0,
      complete: false,
    };
    const target = join(evidence, 'python-test-execution.json');
    writeFileSync(target, JSON.stringify(summary, null, 2) + '\n');
    for (const file of inventory.python) {
      const result = spawnSync('python3', [file], { cwd: root, encoding: 'utf8' });
      process.stdout.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`Python test failed: ${file}`);
      const assertions = Number((result.stderr || '').match(/Ran (\d+) tests?/)?.[1] || 0);
      if (!assertions || /skipped=/i.test(result.stderr || ''))
        throw new Error(`Python test execution incomplete: ${file}`);
      summary.executed++;
      summary.assertions += assertions;
    }
    summary.complete = true;
    writeFileSync(target, JSON.stringify(summary, null, 2) + '\n');
    return;
  }
  if (process.argv.includes('--node')) {
    if (!inventory.node.length) throw new Error('Node test selection is empty');
    const nodeReport = join(evidence, 'node-tests.tap');
    const nodeSummary = join(evidence, 'node-test-execution.json');
    rmSync(nodeReport, { force: true });
    writeFileSync(
      nodeSummary,
      JSON.stringify({ discovered: inventory.node.length, executed: 0, complete: false }, null, 2) +
        '\n',
    );
    const result = spawnSync(
      process.execPath,
      [
        '--test',
        '--test-reporter=spec',
        '--test-reporter=tap',
        '--test-reporter-destination=stdout',
        `--test-reporter-destination=${nodeReport}`,
        ...inventory.node,
      ],
      {
        cwd: root,
        stdio: 'inherit',
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Node tool tests failed');
    const tap = readFileSync(nodeReport, 'utf8');
    const assertions = Number(tap.match(/^# tests (\d+)$/m)?.[1] || 0);
    const skipped =
      Number(tap.match(/^# skipped (\d+)$/m)?.[1] || 0) +
      Number(tap.match(/^# todo (\d+)$/m)?.[1] || 0);
    if (!assertions || skipped)
      throw new Error(
        `Node test execution incomplete: ${assertions} assertions, ${skipped} skipped`,
      );
    writeFileSync(
      nodeSummary,
      JSON.stringify(
        {
          discovered: inventory.node.length,
          executed: inventory.node.length,
          assertions,
          skipped,
          complete: true,
        },
        null,
        2,
      ) + '\n',
    );
    return;
  }
  const smoke = process.argv.includes('--smoke');
  const files = smoke ? smokeFiles : inventory.vitest;
  const missing = files.filter((file) => !inventory.vitest.includes(file));
  if (missing.length) throw new Error(`Required smoke files missing: ${missing.join(', ')}`);
  if (!files.length) throw new Error('Vitest selection is empty');
  const size = positiveInteger(
    process.env.BATCH_SIZE || process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 20,
    'batch size',
  );
  const workers = positiveInteger(process.env.VITEST_WORKERS || 1, 'workers');
  const pool = process.env.VITEST_POOL || 'forks';
  if (!['forks', 'threads'].includes(pool)) throw new Error('VITEST_POOL must be forks or threads');
  const summary = {
    discovered: inventory.vitest.length,
    selected: files.length,
    scope: smoke ? 'smoke' : 'full',
    executed: 0,
    assertions: 0,
    skipped: 0,
    complete: false,
  };
  const summaryPath = join(evidence, smoke ? 'test-smoke-execution.json' : 'test-execution.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  for (let i = 0; i < files.length; i += size) {
    const chunk = files.slice(i, i + size);
    const reportPath = join(
      evidence,
      `batch-${smoke ? 'smoke-' : ''}${Math.floor(i / size) + 1}.json`,
    );
    rmSync(reportPath, { force: true });
    console.log(
      `\n[batch ${Math.floor(i / size) + 1}/${Math.ceil(files.length / size)}] ${chunk.length} files`,
    );
    const result = spawnSync(
      process.execPath,
      [
        join(root, 'node_modules/vitest/vitest.mjs'),
        'run',
        `--pool=${pool}`,
        `--maxWorkers=${workers}`,
        '--reporter=dot',
        '--reporter=json',
        `--outputFile.json=${reportPath}`,
        ...chunk,
      ],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
        },
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(
        `Batch ${Math.floor(i / size) + 1} failed; ${summary.executed}/${summary.selected} files validated`,
      );
    const validated = validateRunReport(chunk, JSON.parse(readFileSync(reportPath, 'utf8')), root);
    summary.executed += validated.files;
    summary.assertions += validated.assertions;
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  }
  summary.complete = true;
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  console.log(
    `Verified ${summary.executed}/${summary.selected} selected files (${summary.discovered} discovered), ${summary.assertions} assertions, ${summary.skipped} skipped.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
