#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = process.env.APP_FILE || 'src/App.tsx'
const limit = Number(process.env.APP_LINE_LIMIT || 60)

const path = resolve(process.cwd(), target)
let content
try {
  content = readFileSync(path, 'utf8')
} catch (err) {
  console.error(`[check-app-lines] Cannot read ${path}:`, err?.message || err)
  process.exit(2)
}

const lines = content.split(/\r?\n/).length
if (lines > limit) {
  console.error(`App file too long: ${lines} lines (limit ${limit}).`)
  process.exit(1)
} else {
  console.log(`App file within limit: ${lines}/${limit} lines.`)
}

