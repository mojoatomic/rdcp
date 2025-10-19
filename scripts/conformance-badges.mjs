#!/usr/bin/env node
/*
  RDCP Conformance → Badges
  - Reads reports/rdcp.results.json
  - Writes Shields-compatible JSON and a simple SVG badge to reports/badges/
*/
import fs from 'node:fs'
import path from 'node:path'

const RESULTS = process.env.RDCP_RESULTS || 'reports/rdcp.results.json'
const OUT_DIR = process.env.RDCP_BADGES_OUT || 'reports/badges'

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function readResults(file) {
  const txt = fs.readFileSync(file, 'utf8')
  return JSON.parse(txt)
}

function colorFor(failed) {
  if (failed === 0) return 'brightgreen'
  if (failed < 5) return 'yellow'
  return 'red'
}

function svgBadge(label, message, color) {
  // Minimal SVG badge (no dependency). Widths are approximate for short texts.
  const pad = 6
  const charW = 7
  const lh = label.length * charW + pad * 2
  const rh = message.length * charW + pad * 2
  const w = lh + rh
  const h = 20
  const labelX = lh / 2
  const msgX = lh + rh / 2
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="m"><rect width="${w}" height="${h}" rx="3" fill="#fff"/></mask>
  <g mask="url(#m)">
    <rect width="${lh}" height="${h}" fill="#555"/>
    <rect x="${lh}" width="${rh}" height="${h}" fill="${color === 'brightgreen' ? '#4c1' : color === 'yellow' ? '#dfb317' : '#e05d44'}"/>
    <rect width="${w}" height="${h}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelX}" y="14">${label}</text>
    <text x="${msgX}" y="14">${message}</text>
  </g>
</svg>`
}

function main() {
  const results = readResults(RESULTS)
  const passed = Number(results?.summary?.passed || 0)
  const total = Number(results?.summary?.total || 0)
  const failed = Math.max(0, total - passed)
  const color = colorFor(failed)

  ensureDir(OUT_DIR)

  // Shields JSON
  const shields = {
    schemaVersion: 1,
    label: 'rdcp conformance',
    message: `${passed}/${total}`,
    color,
  }
  fs.writeFileSync(path.join(OUT_DIR, 'rdcp-summary.json'), JSON.stringify(shields, null, 2))

  // SVG badge
  const svg = svgBadge('RDCP', `${passed}/${total}`, color)
  fs.writeFileSync(path.join(OUT_DIR, 'rdcp-summary.svg'), svg)

  console.log(`Badges written to ${OUT_DIR}`)
}

main()
