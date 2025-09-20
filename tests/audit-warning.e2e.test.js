const express = require('express')
const request = require('supertest')
const { adapters } = require('..')

const allowAuth = async () => true

function buildAppWithAuditWarn() {
  const app = express()
  app.use(express.json())

  app.use(
    adapters.express.createRDCPMiddleware({
      authenticator: allowAuth,
      capabilities: {
        audit: {
          enabled: true,
          sink: 'console',
          sampleRate: 1,
          failureMode: 'warn',
          // Simulate audit failure by throwing in redact
          // (server treats any error in audit write path as failure)
          redact: () => {
            throw new Error('simulated redact failure')
          },
        },
      },
    })
  )

  return app
}

describe('Express adapter - Audit warn Warning header', () => {
  test('POST /rdcp/v1/control sets Warning header when audit fails and failureMode=warn', async () => {
    const app = buildAppWithAuditWarn()

    const res = await request(app)
      .post('/rdcp/v1/control')
      .send({ action: 'enable', categories: ['API_ROUTES'] })

    expect(res.status).toBe(200)
    expect(res.headers['warning']).toBe('199 rdcp "audit-write-failed"')
  })
})
