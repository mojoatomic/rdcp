const express = require('express')
const morgan = require('morgan')
const { v4: uuidv4 } = require('uuid')
const { createRDCPServer } = require('@rdcp/server')
const { OpenTelemetryProvider } = require('@rdcp/otel-plugin')

// RDCP Server configuration
const rdcp = createRDCPServer({
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
  },
  traceProvider: new OpenTelemetryProvider()
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
rdcpRouter.get('/.well-known/rdcp', (req, res) => res.json(rdcp.discoveryDocument()))
rdcpRouter.get('/rdcp/v1/discovery', async (req, res) => res.json(await rdcp.discovery()))
rdcpRouter.post('/rdcp/v1/control', async (req, res) => res.json(await rdcp.control(req.body)))
rdcpRouter.get('/rdcp/v1/status', async (req, res) => res.json(await rdcp.status()))
rdcpRouter.get('/rdcp/v1/health', async (req, res) => res.json(await rdcp.health()))
app.use('/', rdcpRouter)

// Business API routes demonstrating debug categories
const apiRouter = express.Router()

apiRouter.get('/users', async (req, res) => {
  rdcp.debug.log('API_ROUTES', 'Listing users', { requestId: req.id })
  await rdcp.debug.measure('DATABASE', 'fetchUsers', async () => new Promise(r => setTimeout(r, 10)))
  res.json({ users: [{ id: '1', name: 'Ada' }], protocol: 'rdcp/1.0', requestId: req.id })
})

apiRouter.post('/reports', async (req, res) => {
  rdcp.debug.log('REPORTS', 'Generating report', { requestId: req.id, params: req.body })
  await rdcp.debug.measure('REPORTS', 'generate', async () => new Promise(r => setTimeout(r, 20)))
  res.json({ success: true, protocol: 'rdcp/1.0', requestId: req.id })
})

app.use('/api', apiRouter)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.info(`RDCP Demo App listening on http://localhost:${port}`)
  console.info('Endpoints: /.well-known/rdcp, /rdcp/v1/{discovery,control,status,health}, /api/{users,reports}')
})
