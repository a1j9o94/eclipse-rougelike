#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PIDS_DIR = path.join(ROOT, 'coding_agents', 'pids')
const LOGS_DIR = path.join(ROOT, 'coding_agents', 'logs')

const args = process.argv.slice(2)
const linesArg = args.find(a => a.startsWith('--lines='))
const agentArg = args.find(a => a.startsWith('--agent='))
const includeExited = args.includes('--all')
const LINES = Number((linesArg ? linesArg.split('=')[1] : '') || 40)
const ONLY_AGENT = agentArg ? agentArg.split('=')[1] : null

function isAlive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

function tailLines(text, n) {
  const parts = text.split(/\r?\n/)
  const slice = parts.slice(-n)
  return slice.join('\n')
}

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
  for (const f of files) {
    const name = f.replace(/\.pid$/, '')
    if (ONLY_AGENT && ONLY_AGENT !== name) continue
    const pidStr = fs.readFileSync(path.join(PIDS_DIR, f), 'utf8').trim()
    const pid = Number(pidStr || 0)
    const running = isAlive(pid)
    if (!running && !includeExited) continue
    const logPath = path.join(LOGS_DIR, `${name}.out`)
    console.log(`\n=== ${name} (${running ? `RUNNING:${pid}` : 'EXITED'}) ===`)
    console.log(logPath)
    if (!fs.existsSync(logPath)) { console.log('(no log file yet)'); continue }
    try {
      const data = fs.readFileSync(logPath, 'utf8')
      console.log(tailLines(data, LINES))
    } catch (e) {
      console.log('(failed to read log)', String(e))
    }
  }
}

main()

