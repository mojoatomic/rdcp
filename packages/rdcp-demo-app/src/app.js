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
    multiTenancy: true,
    performanceMetrics: true,
    temporaryControls: false,
    auditTrail: true
  }
})

// Build and export the Express app (no listen here; useful for Supertest)
const app = express()
app.use(express.json())
app.use(morgan('dev'))

// Explicit RDCP header enforcement (fast-fail for /rdcp/v1/*)
function enforceRDCPHeaders(req, res, next) {
  if (!req.path.startsWith('/rdcp/v1/')) return next()

  const method = req.headers['x-rdcp-auth-method']
  const clientId = req.headers['x-rdcp-client-id']

  if (!method) {
    return res
      .status(401)
      .json(createRDCPError('RDCP_AUTH_REQUIRED', 'Missing required header: X-RDCP-Auth-Method'))
  }
  const validMethods = ['api-key', 'bearer', 'mtls', 'hybrid']
  if (!validMethods.includes(String(method))) {
    return res
      .status(401)
      .json(createRDCPError('RDCP_AUTH_REQUIRED', 'Invalid X-RDCP-Auth-Method'))
  }
  if (!clientId) {
    return res
      .status(401)
      .json(createRDCPError('RDCP_AUTH_REQUIRED', 'Missing required header: X-RDCP-Client-ID'))
  }
  return next()
}

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

// Tenant context decorator: add tenant object to RDCP responses when applicable
function getTenantContext(req) {
  const tenantId = String(req.params?.tenantId || req.headers['x-rdcp-tenant-id'] || '').trim()
  const isolationLevel = String(req.headers['x-rdcp-isolation-level'] || 'organization').trim()
  const scope = tenantId ? 'tenant-isolated' : 'global'
  return { id: tenantId || 'default', isolationLevel, scope }
}

function decorateTenantContext(req, res, next) {
  const origJson = res.json.bind(res)
  res.json = (body) => {
    try {
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        if (!body.protocol) body.protocol = 'rdcp/1.0'
        const routeIsRDCP = req.path.startsWith('/rdcp/') || req.path.startsWith('/.well-known/rdcp')
        const hasTenantHeader = !!(req.params?.tenantId || req.headers['x-rdcp-tenant-id'])
        if (routeIsRDCP && !body.tenant) {
          body.tenant = getTenantContext(req)
        } else if (hasTenantHeader && !body.tenant) {
          body.tenant = getTenantContext(req)
        }
      }
    } catch (_) {
      // no-op
    }
    return origJson(body)
  }
  next()
}

// Rate limiting for control endpoint (demo-only, configurable)
const rateState = new Map()
function isTenantControlPath(path) {
  return path.startsWith('/rdcp/v1/tenants/') && path.endsWith('/control')
}
function rateLimitControl(req, res, next) {
  if (!(req.path === '/rdcp/v1/control' || isTenantControlPath(req.path))) return next()
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
  const isGlobalControl = req.path === '/rdcp/v1/control' && req.method === 'POST'
  const isTenantControl = isTenantControlPath(req.path) && req.method === 'POST'
  if (!(isGlobalControl || isTenantControl)) return next()
  const origJson = res.json.bind(res)
  res.json = (body) => {
    try {
      const entry = {
        event: 'RDCP_AUDIT',
        timestamp: new Date().toISOString(),
        action: req.body?.action,
        categories: req.body?.categories,
        tenantId: req.params?.tenantId || req.headers['x-rdcp-tenant-id'] || 'default',
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

// RBAC example: for control endpoint under bearer auth, require 'control' scope
function enforceControlRBAC(req, res, next) {
  if (req.path !== '/rdcp/v1/control' || req.method !== 'POST') return next()
  const method = String(req.headers['x-rdcp-auth-method'] || '')
  if (method !== 'bearer') return next()
  try {
    const result = validateRDCPAuth(req)
    const scopes = Array.isArray(result?.scopes) ? result.scopes : []
    const tenantId = String(req.headers['x-rdcp-tenant-id'] || '').trim()

    const hasGlobal = scopes.includes('control')
    let allowed = hasGlobal
    if (!allowed && tenantId) {
      allowed = scopes.includes(`control:${tenantId}`)
    }

    if (!result?.valid || !allowed) {
      return res
        .status(403)
        .json(createRDCPError('RDCP_FORBIDDEN', tenantId ? 'Insufficient scope for tenant' : 'Insufficient scope: control'))
    }
    return next()
  } catch (e) {
    return res
      .status(403)
      .json(createRDCPError('RDCP_FORBIDDEN', 'Insufficient scope'))
  }
}

// Tenant-scoped settings storage (demo only)
const tenantSettings = new Map()

// TTL timers for temporary controls per tenant/category
const ttlTimers = new Map()

function parseDurationToMs(input) {
  if (!input) return 0
  if (typeof input === 'number' && Number.isFinite(input)) return Math.max(0, input)
  const s = String(input).trim()
  const m = s.match(/^(\d+)(ms|s|m)?$/)
  if (!m) return 0
  const value = parseInt(m[1], 10)
  const unit = m[2] || 'ms'
  if (unit === 'ms') return value
  if (unit === 's') return value * 1000
  if (unit === 'm') return value * 60 * 1000
  return 0
}

function scheduleCategoryTTL(tenantId, category, ms) {
  const key = `${tenantId}:${category}`
  // Clear any existing timer
  const existing = ttlTimers.get(key)
  if (existing) clearTimeout(existing)
  if (ms <= 0) return
  const t = setTimeout(() => {
    try {
      const cur = tenantSettings.get(tenantId) || { features: [], categories: [] }
      cur.categories = (cur.categories || []).filter((c) => c !== category)
      tenantSettings.set(tenantId, cur)
    } finally {
      ttlTimers.delete(key)
    }
  }, ms)
  ttlTimers.set(key, t)
}

// Generic tenant RBAC middleware factory
function requireTenantScope(scopeBase) {
  return function (req, res, next) {
    const method = String(req.headers['x-rdcp-auth-method'] || '')
    if (method !== 'bearer') {
      return res
        .status(401)
        .json(createRDCPError('RDCP_AUTH_REQUIRED', 'Bearer token required for tenant route'))
    }
    try {
      const result = validateRDCPAuth(req)
      if (!result?.valid) {
        return res.status(401).json(createRDCPError('RDCP_AUTH_REQUIRED', 'Invalid bearer token'))
      }
      const scopes = Array.isArray(result?.scopes) ? result.scopes : []
      const tenantId = String(req.params?.tenantId || '').trim()

      const hasGlobal = scopes.includes(scopeBase)
      let allowed = hasGlobal
      if (!allowed && tenantId) {
        allowed = scopes.includes(`${scopeBase}:${tenantId}`)
      }

      if (!allowed) {
        return res
          .status(403)
          .json(
            createRDCPError(
              'RDCP_FORBIDDEN',
              tenantId ? `Insufficient scope for tenant ${tenantId}` : `Insufficient scope: ${scopeBase}`
            )
          )
      }
      return next()
    } catch (e) {
      return res.status(401).json(createRDCPError('RDCP_AUTH_REQUIRED', 'Invalid bearer token'))
    }
  }
}

// Apply tenant context decorator before defining routes so it affects all handlers
app.use(decorateTenantContext)
// Tenant routes
app.get('/rdcp/v1/tenants/:tenantId/settings', requireTenantScope('read'), (req, res) => {
  const tenantId = String(req.params.tenantId)
  const data = tenantSettings.get(tenantId) || { features: [], categories: [] }
  res.json({ tenantId, settings: data, protocol: 'rdcp/1.0', requestId: req.id })
})

app.post('/rdcp/v1/tenants/:tenantId/control', requireTenantScope('control'), (req, res) => {
  const tenantId = String(req.params.tenantId)
  const { action, categories, options } = req.body || {}
  const cur = tenantSettings.get(tenantId) || { features: [], categories: [] }
  const cats = Array.isArray(categories) ? categories : []

  if (action === 'enable') {
    cur.categories = Array.from(new Set([...(cur.categories || []), ...cats]))
    // Handle temporary controls with TTL
    const temporary = !!(options && options.temporary)
    const durationMs = parseDurationToMs(options && options.duration)
    if (temporary && durationMs > 0) {
      for (const c of cats) scheduleCategoryTTL(tenantId, c, durationMs)
    }
  } else if (action === 'disable') {
    // Clear any pending TTL timers for disabled categories
    for (const c of cats) {
      const key = `${tenantId}:${c}`
      const t = ttlTimers.get(key)
      if (t) {
        clearTimeout(t)
        ttlTimers.delete(key)
      }
    }
    cur.categories = (cur.categories || []).filter((c) => !cats.includes(c))
  }
  tenantSettings.set(tenantId, cur)
  const response = { success: true, tenantId, protocol: 'rdcp/1.0', requestId: req.id }
  if (options && options.temporary && options.duration) {
    response.temporary = { enabled: true, duration: String(options.duration) }
  }
  res.json(response)
})

// Mount RDCP middleware (handles /.well-known/rdcp and /rdcp/v1/*)
app.use(enforceRDCPHeaders)
app.use(rateLimitControl)
app.use(auditControl)
app.use(enforceControlRBAC)
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
