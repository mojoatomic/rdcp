#!/usr/bin/env node
/*
 Headless validation of RDCP data layer
 - Imports @rdcp.dev/client, @rdcp.dev/core, @rdcp.dev/admin-ui
 - Calls discovery/status on the RDCP server
 - Builds AdminUISpec from discovery
 - Prints both JSON blobs

Usage:
  RDCP_API_KEY=dev-key-change-in-production-min-32-chars \
  node --enable-source-maps scripts/validate-admin-data.mjs

Optional env:
  RDCP_BASE_URL  (default: http://localhost:3000)
  RDCP_CLIENT_ID (default: admin-app)
*/
import { createRDCPClient } from '@rdcp.dev/client'
import { RDCP_HEADERS } from '@rdcp.dev/core'
import { createAdminUISpec } from '@rdcp.dev/admin-ui'

const baseUrl = process.env.RDCP_BASE_URL || 'http://localhost:3000'
const clientId = process.env.RDCP_CLIENT_ID || 'admin-app'
const apiKey = process.env.RDCP_API_KEY

const headers = {
  [RDCP_HEADERS.AUTH_METHOD]: 'api-key',
  [RDCP_HEADERS.CLIENT_ID]: clientId,
  ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
}

async function main() {
  const rdcp = createRDCPClient({ baseUrl, headers })
  const discovery = await rdcp.getDiscovery()
  const status = await rdcp.getStatus()
  const spec = createAdminUISpec(discovery)

  console.log('--- AdminUISpec ---')
  console.log(JSON.stringify(spec, null, 2))
  console.log('--- Discovery+Status ---')
  console.log(JSON.stringify({ discovery, status }, null, 2))
}

main().catch((err) => {
  console.error('Validation failed:', err)
  process.exit(1)
})
