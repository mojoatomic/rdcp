const express = require('express')
const morgan = require('morgan')
const { v4: uuidv4 } = require('uuid')
const { 
  adapters, 
  protocolDiscovery, 
  debugSystemDiscovery, 
  runtimeControl, 
  statusMonitoring, 
  healthCheck,
  debug,
  setTraceProvider,
  validateRDCPAuth
} = require('@rdcp/server')
const { OpenTelemetryProvider } = require('@rdcp/otel-plugin')

// Set up trace provider
setTraceProvider(new OpenTelemetryProvider())

// Create RDCP middleware for Express
const rdcpMiddleware = adapters.express.createRDCPMiddleware({
  authenticator: validateRDCPAuth,
  security: {
    level: 'standard',
    methods: ['api-key', 'bearer'],
    required: true
  },
  capabilities: {
    multiTenancy: false,
    performanceMetrics: true,
    temporaryControls: false,
    auditTrail: true
  }
})

const app = express()
app.use(express.json())
app.use(morgan('dev'))

// Request correlation IDs
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4()
  res.setHeader('X-Request-ID', req.id)
  next()
})

// RDCP protocol endpoints
const rdcpRouter = express.Router()
rdcpRouter.get('/.well-known/rdcp', protocolDiscovery)
rdcpRouter.get('/rdcp/v1/discovery', debugSystemDiscovery)
rdcpRouter.post('/rdcp/v1/control', runtimeControl)
rdcpRouter.get('/rdcp/v1/status', statusMonitoring)
rdcpRouter.get('/rdcp/v1/health', healthCheck)
app.use('/', rdcpRouter)

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

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.info(`RDCP Demo App listening on http://localhost:${port}`)
  console.info('Endpoints: /.well-known/rdcp, /rdcp/v1/{discovery,control,status,health}, /api/{users,reports}')
})
