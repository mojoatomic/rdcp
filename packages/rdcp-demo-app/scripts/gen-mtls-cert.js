// Generate a mock JSON certificate and print base64 for demo/testing
// Usage: node scripts/gen-mtls-cert.js client.tenant123.rdcp.internal

const crypto = require('crypto')

const cn = process.argv[2] || 'client.tenant123.rdcp.internal'
const now = new Date()
const validFrom = new Date(now.getTime() - 60 * 1000) // valid 1 min ago
const validTo = new Date(now.getTime() + 60 * 60 * 1000) // valid for 1 hour

// Minimal mock X509-like object our validator accepts via JSON path
const mockCert = {
  subject: `CN=${cn}, O=RDCP Demo, C=US`,
  validFrom: validFrom.toISOString(),
  validTo: validTo.toISOString(),
  keyUsage: ['digitalSignature'],
  fingerprint256: crypto.randomBytes(32).toString('hex')
}

const json = JSON.stringify(mockCert)
const b64 = Buffer.from(json).toString('base64')
process.stdout.write(b64)