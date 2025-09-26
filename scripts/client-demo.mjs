#!/usr/bin/env node
/*
 RDCP Client-first demo script

 Usage:
   RDCP_BASE_URL=http://localhost:3000 \
   RDCP_AUTH_METHOD=api-key \
   RDCP_CLIENT_ID=demo-client \
   RDCP_API_KEY=your-32+char-key \
   node scripts/client-demo.mjs

 Env vars:
   RDCP_BASE_URL       - Base URL of the RDCP server (default: http://localhost:3000)
   RDCP_CLIENT_ID      - Client identifier (default: demo-client)
   RDCP_TENANT_ID      - Optional tenant id
   RDCP_AUTH_METHOD    - api-key | bearer | mtls (default: api-key)
   RDCP_API_KEY        - API key (when RDCP_AUTH_METHOD=api-key)
   RDCP_BEARER_TOKEN   - Bearer token (when RDCP_AUTH_METHOD=bearer)
*/

import { createRDCPClient } from '@rdcp.dev/client'
import { RDCP_HEADERS } from '@rdcp.dev/core'

function buildHeaders() {
  const method = (process.env.RDCP_AUTH_METHOD || 'api-key').toLowerCase()
  const clientId = process.env.RDCP_CLIENT_ID || 'demo-client'
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

async function main() {
  const baseUrl = process.env.RDCP_BASE_URL || 'http://localhost:3000'
  const headers = buildHeaders()
  const rdcp = createRDCPClient({ baseUrl, headers })

  console.log('RDCP baseUrl:', baseUrl)
  console.log('RDCP headers:', {
    [RDCP_HEADERS.AUTH_METHOD]: headers[RDCP_HEADERS.AUTH_METHOD],
    [RDCP_HEADERS.CLIENT_ID]: headers[RDCP_HEADERS.CLIENT_ID],
    [RDCP_HEADERS.TENANT_ID]: headers[RDCP_HEADERS.TENANT_ID],
    'authorization?': Boolean(headers['authorization']),
    'x-api-key?': Boolean(headers['x-api-key']),
  })

  console.log('\n1) Protocol discovery (.well-known/rdcp via server SDK; discovery via client)')
  const discovery = await rdcp.getDiscovery()
  console.log('Discovery categories:', Object.keys(discovery.categories || {}))

  console.log('\n2) Status before changes')
  const status0 = await rdcp.getStatus()
  console.log('Status:', { categories: status0.categories, timestamp: status0.timestamp })

  console.log('\n3) Enable a debug category with TTL (2m)')
  const controlRes = await rdcp.postControl({
    action: 'enable',
    categories: ['API_ROUTES'],
    temporary: '2m',
  })
  console.log('Control response:', { success: controlRes.success, timestamp: controlRes.timestamp })

  console.log('\n4) Status after change')
  const status1 = await rdcp.getStatus()
  console.log('Status:', { categories: status1.categories, timestamp: status1.timestamp })

  console.log('\n5) Health check')
  const health = await rdcp.getHealth()
  console.log('Health:', { status: health.status, timestamp: health.timestamp })

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('RDCP client demo failed:', err)
  process.exit(1)
})