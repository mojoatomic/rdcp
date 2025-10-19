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

function collectCases(results) {
  const out = []
  const suites = Array.isArray(results.suites) ? results.suites : []
  for (const s of suites) {
    const inner = Array.isArray(s.suites) ? s.suites : []
    for (const t of inner) {
      out.push({
        status: t.status || 'passed',
        tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
        title: t.title || '',
        file: s.file || '',
      })
    }
  }
  return out
}

function writeBadgeFiles(prefix, label, passed, total) {
  const failed = Math.max(0, total - passed)
  const color = colorFor(failed)
  const shields = {
    schemaVersion: 1,
    label,
    message: `${passed}/${total}`,
    color,
  }
  fs.writeFileSync(path.join(OUT_DIR, `${prefix}.json`), JSON.stringify(shields, null, 2))
  fs.writeFileSync(path.join(OUT_DIR, `${prefix}.svg`), svgBadge(label.toUpperCase(), `${passed}/${total}`, color))
}

function summarize(cases, filterFn = () => true) {
  const list = cases.filter(filterFn)
  const total = list.length
  const passed = list.filter(c => c.status === 'passed').length
  return { passed, total }
}

function main() {
  const results = readResults(RESULTS)
  ensureDir(OUT_DIR)

  const all = collectCases(results)
  const overall = summarize(all)
  writeBadgeFiles('rdcp-summary', 'rdcp conformance', overall.passed, overall.total)

  // Profiles
  const profiles = ['basic', 'standard', 'enterprise']
  for (const p of profiles) {
    const { passed, total } = summarize(all, c => c.tags.includes(p))
    writeBadgeFiles(`profile-${p}`, `${p}`, passed, total)
  }

  // Capabilities/areas
  const areas = [
    'control','jwks','keyring','jwt','admin','etag','util','otel','tenant','ttl','audit','rate-limit','client','integration','status','auth','headers','metrics','put','schema'
  ]
  for (const a of areas) {
    const { passed, total } = summarize(all, c => c.tags.includes(a))
    writeBadgeFiles(`cap-${a}`, `${a}`, passed, total)
  }

  console.log(`Badges written to ${OUT_DIR}`)
}

main()
