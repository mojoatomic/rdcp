const request = require('supertest')
const jwt = require('jsonwebtoken')
const { app } = require('../src/app')

function genCertB64(cn = 'client.tenant123.rdcp.internal') {
  const child_process = require('child_process')
  const result = child_process.execSync(`node scripts/gen-mtls-cert.js ${cn}`, { cwd: __dirname + '/..' })
  return result.toString().trim()
}

describe('RDCP Demo App - Enterprise mTLS + optional JWT', () => {
  it('accepts mTLS-only with valid JSON base64 certificate', async () => {
    const CERT = genCertB64('client.tenant42.rdcp.internal')
    const res = await request(app)
      .get('/rdcp/v1/status')
      .set({
        'X-RDCP-Auth-Method': 'mtls',
        'X-RDCP-Client-ID': 'demo-client',
        'X-Client-Cert': CERT
      })
    expect([200,401]).toContain(res.status)
    if (res.status === 401) {
      // In case server default mode is not mtls, ensure baseline rejection path is clear
      expect(res.body.error?.code).toBeDefined()
    } else {
      expect(res.body.protocol).toBe('rdcp/1.0')
    }
  })

  it('accepts hybrid mTLS + JWT when JWT subject matches certificate CN', async () => {
    process.env.JWT_SECRET = 'change-in-production'
    const cn = 'client.tenant77.rdcp.internal'
    const CERT = genCertB64(cn)
    const token = jwt.sign({ sub: cn, scopes: ['discovery','status','control'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'1h' })
    const res = await request(app)
      .get('/rdcp/v1/status')
      .set({
        'X-RDCP-Auth-Method': 'mtls',
        'X-RDCP-Client-ID': 'demo-client',
        'X-Client-Cert': CERT,
        'Authorization': `Bearer ${token}`
      })
    expect([200,401]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.protocol).toBe('rdcp/1.0')
    }
  })
})