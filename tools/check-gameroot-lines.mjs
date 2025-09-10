#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = process.env.GAMEROOT_FILE || 'src/GameRoot.tsx'
const limit = Number(process.env.GAMEROOT_LINE_LIMIT || 200)

const path = resolve(process.cwd(), target)
let content
try {
  content = readFileSync(path, 'utf8')
} catch (err) {
  console.error(`[check-gameroot-lines] Cannot read ${path}:`, err?.message || err)
  process.exit(2)
}

const lines = content.split(/\r?\n/).length
if (lines > limit) {
  console.error(`GameRoot file too long: ${lines} lines (limit ${limit}).`)
  process.exit(1)
} else {
  console.log(`GameRoot within limit: ${lines}/${limit} lines.`)
}

