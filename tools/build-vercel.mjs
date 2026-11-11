#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
// Preview deployments must never publish a backend. The production release contract is retained.
const command = process.env.VERCEL_ENV === 'production' ? 'build:release' : 'build:frontend';
console.log(`Vercel ${process.env.VERCEL_ENV || 'local'} build: ${command}`);
const result = spawnSync('npm', ['run', command], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
