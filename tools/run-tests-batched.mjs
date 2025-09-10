#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

function walk(dir){
  const out = []
  for (const name of readdirSync(dir)){
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

function isTestFile(p){
  const exts = new Set(['.ts','.tsx','.js','.jsx'])
  const e = extname(p)
  if (!exts.has(e)) return false
  return /\.(test|spec)\.[tj]sx?$/.test(p)
}

const root = process.cwd()
const candidates = []
try { candidates.push(...walk(join(root, 'src/__tests__'))) } catch {}
// Fallback: scan src for spec files if needed
if (candidates.length === 0){
  try { candidates.push(...walk(join(root, 'src'))) } catch {}
}
const files = candidates.filter(isTestFile).sort()
if (files.length === 0){
  console.error('No test files found')
  process.exit(1)
}

const size = Number(process.env.BATCH_SIZE || process.argv[2] || 20)
const pool = process.env.VITEST_POOL || 'forks'
const maxWorkers = Number(process.env.VITEST_WORKERS || 1)

let ok = true
for (let i=0; i<files.length; i+=size){
  const chunk = files.slice(i, i+size)
  console.log(`\n[batch ${Math.floor(i/size)+1}/${Math.ceil(files.length/size)}] ${chunk.length} files`) 
  for (const f of chunk) console.log(`  - ${f}`)
  const res = spawnSync('npx', [
    'vitest','run',
    `--pool=${pool}`, `--maxWorkers=${maxWorkers}`,
    '--reporter=dot',
    ...chunk,
  ], { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096' } })
  if (res.status !== 0){ ok = false; break }
}

process.exit(ok ? 0 : 1)
