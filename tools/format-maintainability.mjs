#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
// Expand this explicit ownership list as modules are extracted. No whole-repository rewrite.
const targets = [
  'src/second-dawn-game/SecondDawnBoard.tsx',
  'src/second-dawn-game/board/*.{ts,tsx}',
  'src/second-dawn-game/mobileBoard.css',
  'tools/maintainability-*.mjs',
  '.prettierrc.json',
  'src/second-dawn-game/{NativeDialog,GameDialog,GameSettingsPanel,FleetInspection,PublicInspectionModal}.tsx',
  'src/second-dawn-game/nativeDialog.css',
  'tools/run-tests-batched{,.test}.mjs',
  'tools/second-dawn-check-visual{,.test}.mjs',
  'tools/run-browser-verification.mjs',
  'tools/build-vercel{,.test}.mjs',
  'tools/format-maintainability.mjs',
];
const mode = process.argv.includes('--write') ? '--write' : '--check';
const result = spawnSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', mode, ...targets],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
