const express = require('express')
const request = require('supertest')
const path = require('path')
const { adapters } = require('..')

const allowAuth = async () => true

function buildAppWithFileSink(options = {}) {
  const app = express()
  app.use(express.json())

  app.use(
    adapters.express.createRDCPMiddleware({
      authenticator: allowAuth,
      capabilities: {
        audit: {
          enabled: true,
          sink: 'file',
          sampleRate: 1,
          failureMode: options.failureMode || 'warn',
          file: { path: path.resolve(process.cwd(), 'rdcp-audit-test.log'), maxBytes: 1024, maxFiles: 1 },
          redact: () => {
            // Force an exception in the audit path to simulate sink failure handling
            throw new Error('simulated redact failure for file sink')
          },
        },
      },
    })
  )

  return app
}

describe('Express adapter - File sink audit failure behavior', () => {
  test('warn mode adds Warning header when audit failure occurs', async () => {
    const app = buildAppWithFileSink({ failureMode: 'warn' })

    const res = await request(app)
      .post('/rdcp/v1/control')
      .send({ action: 'enable', categories: ['API_ROUTES'] })

    expect(res.status).toBe(200)
    expect(res.headers['warning']).toBe('199 rdcp "audit-write-failed"')
  })

  test('fail mode returns RDCP_AUDIT_WRITE_FAILED (500)', async () => {
    const app = buildAppWithFileSink({ failureMode: 'fail' })

    const res = await request(app)
      .post('/rdcp/v1/control')
      .send({ action: 'enable', categories: ['API_ROUTES'] })

    expect(res.status).toBe(500)
    expect(res.body?.error?.code).toBe('RDCP_AUDIT_WRITE_FAILED')
  })
})
