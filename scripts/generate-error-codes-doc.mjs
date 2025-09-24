#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  // Import built dist (CJS) to read constants from runtime
  const distPath = path.resolve(__dirname, '../dist/index.js')
  const modNs = await import(`file://${distPath}`)
  const mod = modNs.RDCP_ERROR_CODES ? modNs : (modNs.default ?? {})

  const { RDCP_ERROR_CODES, ERROR_STATUS_MAP } = mod
  if (!RDCP_ERROR_CODES || !ERROR_STATUS_MAP) {
    console.error('Could not load RDCP_ERROR_CODES or ERROR_STATUS_MAP from dist. Run `npm run build` first.')
    process.exit(1)
  }

  // Human descriptions (extend as needed)
  const DESCRIPTIONS = {
    RDCP_AUTH_REQUIRED: 'Authentication required',
    RDCP_INVALID_TOKEN: 'Token invalid',
    RDCP_TOKEN_EXPIRED: 'Token expired',
    RDCP_FORBIDDEN: 'Insufficient permissions',
    RDCP_INVALID_CLIENT: 'Invalid client or credentials',
    RDCP_VALIDATION_ERROR: 'Request validation failed',
    RDCP_INVALID_ACTION: 'Invalid control action',
    RDCP_INVALID_CATEGORY: 'Invalid category specified',
    RDCP_CATEGORY_NOT_FOUND: 'Category not found',
    RDCP_MISSING_PARAMETER: 'Required parameter missing',
    RDCP_INVALID_PROTOCOL: 'Unsupported or invalid protocol usage',
    RDCP_NOT_FOUND: 'Resource not found',
    RDCP_RATE_LIMITED: 'Rate limit exceeded',
    RDCP_REQUEST_ID_INVALID: 'Invalid request identifier',
    RDCP_MALFORMED_REQUEST: 'Malformed request payload',
    RDCP_UNSUPPORTED_VERSION: 'Unsupported protocol version',
    RDCP_SERVER_ERROR: 'Server error',
    RDCP_INTERNAL_ERROR: 'Internal server error',
    RDCP_UNAVAILABLE: 'Service unavailable',
    RDCP_TIMEOUT: 'Request timed out',
    RDCP_CONFIGURATION_ERROR: 'Configuration error',
    RDCP_STORAGE_ERROR: 'Storage error',
    RDCP_AUDIT_WRITE_FAILED: 'Audit write failed',
    RDCP_RATE_LIMIT_MISCONFIGURED: 'Rate limit configuration error',
  }

  // Build rows from map, ensuring stable sort
  const entries = Object.keys(RDCP_ERROR_CODES)
    .sort()
    .map(k => RDCP_ERROR_CODES[k])
    .map(code => {
      const status = ERROR_STATUS_MAP[code] ?? ''
      const desc = DESCRIPTIONS[code] ?? ''
      return { code, status, desc }
    })

  const out = []
  out.push('# RDCP Protocol Error Codes')
  out.push('')
  out.push('This file is generated. Do not edit manually.')
  out.push('')
  out.push('| Code | HTTP Status | Description |')
  out.push('|------|-------------|-------------|')
  for (const { code, status, desc } of entries) {
    out.push(`| \`${code}\` | ${status} | ${desc} |`)
  }
  out.push('')

  const outPath = path.resolve(__dirname, '../docs/error-codes.md')
  fs.writeFileSync(outPath, out.join('\n'))
  console.log(`Wrote ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
