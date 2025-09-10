#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PIDS_DIR = path.join(ROOT, 'coding_agents', 'pids')
const LOGS_DIR = path.join(ROOT, 'coding_agents', 'logs')

function isAlive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

function pad(str, len) { return (str + ' '.repeat(len)).slice(0, len) }

function main() {
  if (!fs.existsSync(PIDS_DIR)) {
    console.log('No agents directory found (coding_agents/pids).')
    process.exit(0)
  }
  const files = fs.readdirSync(PIDS_DIR).filter(f => f.endsWith('.pid')).sort()
  if (files.length === 0) {
    console.log('No agents running.')
    process.exit(0)
  }
  console.log(pad('NAME', 28), pad('STATUS', 14), 'LOG')
  for (const f of files) {
    const name = f.replace(/\.pid$/, '')
    const pidStr = fs.readFileSync(path.join(PIDS_DIR, f), 'utf8').trim()
    const pid = Number(pidStr || 0)
    const status = isAlive(pid) ? `RUNNING:${pid}` : 'EXITED'
    const log = path.join(LOGS_DIR, `${name}.out`)
    console.log(pad(name, 28), pad(status, 14), log)
  }
}

main()

