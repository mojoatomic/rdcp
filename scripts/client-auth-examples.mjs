#!/usr/bin/env node
/*
 Simple auth mode examples for RDCP client.

 Examples:
   # API key
   RDCP_BASE_URL=http://localhost:3000 RDCP_AUTH_METHOD=api-key RDCP_API_KEY=your-key node scripts/client-auth-examples.mjs

   # Bearer token
   RDCP_BASE_URL=http://localhost:3000 RDCP_AUTH_METHOD=bearer RDCP_BEARER_TOKEN=jwt node scripts/client-auth-examples.mjs
*/

import { createRDCPClient } from '@rdcp.dev/client'
import { RDCP_HEADERS } from '@rdcp.dev/core'

function buildHeaders({ method, clientId, tenant, apiKey, bearer }) {
  const m = (method || 'api-key').toLowerCase()
  const headers = {
    [RDCP_HEADERS.AUTH_METHOD]: m,
    [RDCP_HEADERS.CLIENT_ID]: clientId || 'demo-client',
  }
  if (tenant) headers[RDCP_HEADERS.TENANT_ID] = tenant
  if (m === 'api-key' && apiKey) headers['x-api-key'] = apiKey
  if (m === 'bearer' && bearer) headers['authorization'] = `Bearer ${bearer}`
  return headers
}

async function run(baseUrl, headers) {
  const rdcp = createRDCPClient({ baseUrl, headers })
  const s = await rdcp.getStatus()
  console.log('OK', { timestamp: s.timestamp })
}

async function main() {
  const baseUrl = process.env.RDCP_BASE_URL || 'http://localhost:3000'
  const method = (process.env.RDCP_AUTH_METHOD || 'api-key').toLowerCase()
  const headers = buildHeaders({
    method,
    clientId: process.env.RDCP_CLIENT_ID,
    tenant: process.env.RDCP_TENANT_ID,
    apiKey: process.env.RDCP_API_KEY,
    bearer: process.env.RDCP_BEARER_TOKEN,
  })

  console.log('Auth method:', method)
  await run(baseUrl, headers)
}

main().catch((err) => {
  console.error('Auth example failed:', err)
  process.exit(1)
})