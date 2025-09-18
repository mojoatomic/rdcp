const express = require('express')
const morgan = require('morgan')
const { v4: uuidv4 } = require('uuid')
const {
  adapters,
  debug,
  setTraceProvider,
  validateRDCPAuth
} = require('@rdcp/server')
const { OpenTelemetryProvider } = require('@rdcp/otel-plugin')

// Set up trace provider for trace correlation in RDCP debug logs
setTraceProvider(new OpenTelemetryProvider())

// Authenticator wrapper using RDCP SDK's validateRDCPAuth
function authenticator(req) {
  try {
    const result = validateRDCPAuth(req)
    return !!(result && result.valid)
  } catch (_) {
    return false
  }
}

// Create RDCP middleware for Express
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator,
  security: {
    level: 'basic',
    methods: ['api-key'],
    required: true
  },
  capabilities: {
    multiTenancy: false,
    performanceMetrics: true,
    temporaryControls: false,
    auditTrail: true
  }
})

// Build and export the Express app (no listen here; useful for Supertest)
const app = express()
app.use(express.json())
app.use(morgan('dev'))

// Request correlation IDs
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4()
  res.setHeader('X-Request-ID', req.id)
  next()
})

// Mount RDCP middleware (handles /.well-known/rdcp and /rdcp/v1/*)
app.use(rdcpMiddleware)

// Business API routes demonstrating debug categories
const apiRouter = express.Router()

apiRouter.get('/users', async (req, res) => {
  debug.api('Listing users', { requestId: req.id })
  debug.database('Fetching users from database')
  await new Promise(r => setTimeout(r, 10)) // Simulate DB call
  res.json({ users: [{ id: '1', name: 'Ada' }], protocol: 'rdcp/1.0', requestId: req.id })
})

apiRouter.post('/reports', async (req, res) => {
  debug.report('Generating report', { requestId: req.id, params: req.body })
  await new Promise(r => setTimeout(r, 20)) // Simulate report generation
  res.json({ success: true, protocol: 'rdcp/1.0', requestId: req.id })
})

app.use('/api', apiRouter)

module.exports = { app }