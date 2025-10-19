#!/usr/bin/env node
// Discovery CLI (moved from @rdcp.dev/server)
import fs from 'node:fs'
import path from 'node:path'
import { argv, exit } from 'node:process'
import http from 'node:http'
import https from 'node:https'

function getArg(name, def) {
  const m = argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.split('=')[1] : def
}

const baseUrl = getArg('base-url', process.env.RDCP_BASE_URL)
const outFile = getArg('out', process.env.RDCP_DISCOVERY_FILE || 'reports/rdcp.discovery.json')
const includeTags = getArg('include-tags', process.env.RDCP_INCLUDE_TAGS || '')
const excludeTags = getArg('exclude-tags', process.env.RDCP_EXCLUDE_TAGS || '')
if (!baseUrl) {
  console.error('Missing --base-url or RDCP_BASE_URL')
  exit(2)
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
  })
}

try {
  const wellKnown = new URL('/.well-known/rdcp', baseUrl).toString()
  const discovery = await fetchJson(wellKnown)
  const endpoints = discovery?.endpoints || {}
  const security = discovery?.security || {}
  const capabilities = discovery?.capabilities || {}

  const profile = security.level || 'basic'
  const methods = (security.methods || []).join(',')

  const payload = {
    ok: true,
    baseUrl,
    profile,
    methods,
    capabilities,
    endpoints,
    ts: new Date().toISOString()
  }
  // Write to file for test gating/reporting
  const dir = path.dirname(outFile)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2))
  // Save run config for tags gating
  const runCfg = {
    includeTags: includeTags ? includeTags.split(',').map(s => s.trim()).filter(Boolean) : [],
    excludeTags: excludeTags ? excludeTags.split(',').map(s => s.trim()).filter(Boolean) : [],
  }
  fs.writeFileSync(path.join(dir, 'rdcp.run.json'), JSON.stringify(runCfg, null, 2))
  console.log(JSON.stringify(payload, null, 2))
} catch (e) {
  console.error('Discovery failed:', e?.message || String(e))
  exit(1)
}
