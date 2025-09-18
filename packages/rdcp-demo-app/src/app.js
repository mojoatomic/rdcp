const express = require('express')
const morgan = require('morgan')
const { v4: uuidv4 } = require('uuid')
const client = require('prom-client')
const {
  adapters,
  debug,
  setTraceProvider,
  validateRDCPAuth,
  createRDCPError
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

// Prometheus metrics setup
const register = new client.Registry()
client.collectDefaultMetrics({ register })
const reqCounter = new client.Counter({
  name: 'rdcp_demo_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['route', 'method', 'status']
})
const reqDuration = new client.Histogram({
  name: 'rdcp_demo_request_duration_seconds',
  help: 'Request duration seconds',
  labelNames: ['route', 'method', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
})
register.registerMetric(reqCounter)
register.registerMetric(reqDuration)

function classifyRoute(path) {
  if (path.startsWith('/.well-known/rdcp') || path.startsWith('/rdcp/')) return 'rdcp'
  if (path.startsWith('/api/')) return 'api'
  return 'other'
}

// Metrics middleware to track each request
app.use((req, res, next) => {
  const route = classifyRoute(req.path)
  const method = req.method
  const endTimer = reqDuration.startTimer({ route, method })
  res.on('finish', () => {
    const status = String(res.statusCode)
    reqCounter.inc({ route, method, status })
    endTimer({ route, method, status })
  })
  next()
})

// Request correlation IDs
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4()
  res.setHeader('X-Request-ID', req.id)
  next()
})

// Rate limiting for control endpoint (demo-only, configurable)
const rateState = new Map()
function rateLimitControl(req, res, next) {
  if (req.path !== '/rdcp/v1/control') return next()
  const windowMs = parseInt(process.env.RATE_LIMIT_CONTROL_WINDOW_MS || '2000', 10)
  const max = parseInt(process.env.RATE_LIMIT_CONTROL_MAX || '3', 10)
  const clientId = req.headers['x-rdcp-client-id'] || 'anonymous'
  let entry = rateState.get(clientId)
  const now = Date.now()
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
  }
  entry.count += 1
  rateState.set(clientId, entry)
  if (entry.count > max) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000))
    return res.status(429).json(createRDCPError('RDCP_RATE_LIMITED', 'Too many control requests'))
  }
  return next()
}

// Audit trail for control operations (structured log)
function auditControl(req, res, next) {
  if (req.path !== '/rdcp/v1/control' || req.method !== 'POST') return next()
  const origJson = res.json.bind(res)
  res.json = (body) => {
    try {
      const entry = {
        event: 'RDCP_AUDIT',
        timestamp: new Date().toISOString(),
        action: req.body?.action,
        categories: req.body?.categories,
        tenantId: req.headers['x-rdcp-tenant-id'] || 'default',
        method: req.headers['x-rdcp-auth-method'] || 'unknown',
        clientId: req.headers['x-rdcp-client-id'] || null,
        statusCode: res.statusCode
      }
      console.info('RDCP_AUDIT', JSON.stringify(entry))
    } catch (_) {
      // no-op
    }
    return origJson(body)
  }
  return next()
}

// Mount RDCP middleware (handles /.well-known/rdcp and /rdcp/v1/*)
app.use(rateLimitControl)
app.use(auditControl)
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

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType)
    const metrics = await register.metrics()
    res.end(metrics)
  } catch (err) {
    res.status(500).send(String(err?.message || 'metrics error'))
  }
})

module.exports = { app }
