#!/usr/bin/env node
/*
Benchmark: @rdcp.dev/client vs direct fetch

Usage:
  RDCP_BASE_URL=http://localhost:3000 \
  RDCP_AUTH_METHOD=api-key \
  RDCP_CLIENT_ID=bench-client \
  RDCP_API_KEY=your-32+char-key \
  node scripts/benchmark-client.mjs

Notes:
- Measures simple GET /status and POST /control (enable/disable) latency
- Prints averages over N iterations
*/

import { performance } from 'node:perf_hooks'
import { createRDCPClient } from '@rdcp.dev/client'
import { RDCP_HEADERS } from '@rdcp.dev/core'

const N = parseInt(process.env.RDCP_BENCH_ITERS || '10', 10)

function buildHeaders() {
  const method = (process.env.RDCP_AUTH_METHOD || 'api-key').toLowerCase()
  const clientId = process.env.RDCP_CLIENT_ID || 'bench-client'
  const tenant = process.env.RDCP_TENANT_ID
  const headers = {
    [RDCP_HEADERS.AUTH_METHOD]: method,
    [RDCP_HEADERS.CLIENT_ID]: clientId,
  }
  if (tenant) headers[RDCP_HEADERS.TENANT_ID] = tenant

  if (method === 'api-key') {
    const key = process.env.RDCP_API_KEY
    if (key) headers['x-api-key'] = key
  } else if (method === 'bearer') {
    const token = process.env.RDCP_BEARER_TOKEN
    if (token) headers['authorization'] = `Bearer ${token}`
  }
  return headers
}

async function bench(fn) {
  const times = []
  for (let i = 0; i < N; i++) {
    const t0 = performance.now()
    // eslint-disable-next-line no-await-in-loop
    await fn()
    const t1 = performance.now()
    times.push(t1 - t0)
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const p95 = times.slice().sort((a, b) => a - b)[Math.floor(times.length * 0.95) - 1]
  return { avg, p95, times }
}

async function benchClient(baseUrl, headers) {
  const rdcp = createRDCPClient({ baseUrl, headers })
  const status = await bench(() => rdcp.getStatus())
  // Toggle enable/disable to avoid rate-limit side-effects; small pause between
  const controlEnable = await bench(() => rdcp.postControl({ action: 'enable', categories: ['API_ROUTES'] }))
  const controlDisable = await bench(() => rdcp.postControl({ action: 'disable', categories: ['API_ROUTES'] }))
  return { status, controlEnable, controlDisable }
}

async function benchFetch(baseUrl, headers) {
  const status = await bench(async () => {
    const res = await fetch(`${baseUrl}/rdcp/v1/status`, { headers })
    if (!res.ok) throw new Error(`status failed: ${res.status}`)
    await res.json()
  })
  const controlEnable = await bench(async () => {
    const res = await fetch(`${baseUrl}/rdcp/v1/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ action: 'enable', categories: ['API_ROUTES'] }),
    })
    if (!res.ok) throw new Error(`control enable failed: ${res.status}`)
    await res.json()
  })
  const controlDisable = await bench(async () => {
    const res = await fetch(`${baseUrl}/rdcp/v1/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ action: 'disable', categories: ['API_ROUTES'] }),
    })
    if (!res.ok) throw new Error(`control disable failed: ${res.status}`)
    await res.json()
  })
  return { status, controlEnable, controlDisable }
}

function print(name, r) {
  const fmt = (x) => `${x.toFixed(2)}ms`
  console.log(`\n${name}`)
  console.log(`  status:         avg=${fmt(r.status.avg)}  p95=${fmt(r.status.p95)}`)
  console.log(`  control enable: avg=${fmt(r.controlEnable.avg)}  p95=${fmt(r.controlEnable.p95)}`)
  console.log(`  control disable:avg=${fmt(r.controlDisable.avg)}  p95=${fmt(r.controlDisable.p95)}`)
}

async function main() {
  const baseUrl = process.env.RDCP_BASE_URL || 'http://localhost:3000'
  const headers = buildHeaders()
  console.log(`Benchmarking with N=${N}, baseUrl=${baseUrl}`)

  const client = await benchClient(baseUrl, headers)
  const direct = await benchFetch(baseUrl, headers)

  print('@rdcp.dev/client', client)
  print('direct fetch', direct)
}

main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})