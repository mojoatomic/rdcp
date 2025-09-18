#!/usr/bin/env node

const express = require('express')
const http = require('http')
const { trace, context, propagation } = require('@opentelemetry/api')

const app = express()
const PORT = process.env.UPSTREAM_PORT || 3001
const tracer = trace.getTracer('upstream-service', '1.0.0')

// Extract incoming context and start a server span per request
app.use((req, res, next) => {
  const parent = propagation.extract(context.active(), req.headers)
  const span = tracer.startSpan(`${req.method} ${req.path}`,
    { kind: 1, attributes: { 'http.method': req.method, 'http.route': req.path } },
    parent)
  req.ctx = trace.setSpan(parent, span)
  req.span = span
  const sc = span.spanContext()
  res.set({ 'X-Trace-Id': sc.traceId, 'X-Span-Id': sc.spanId, 'X-Service': 'upstream-service' })
  next()
})

// Minimal downstream caller to rdcp-demo-app (preserves W3C context)
function downstream(path, ctx) {
  return new Promise((resolve, reject) => {
    const span = tracer.startSpan(`GET ${path}`, { kind: 3, attributes: { 'http.url': `http://localhost:3000${path}` } }, ctx)
    const headers = {}
    propagation.inject(trace.setSpan(ctx, span), headers)

    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'GET', headers: { ...headers, 'User-Agent': 'upstream-service/1.0.0', 'Accept': 'application/json' } },
      res => {
        let data = ''
        res.on('data', d => (data += d))
        res.on('end', () => {
          span.end()
          let body = data
          try {
            if ((res.headers['content-type'] || '').includes('application/json')) body = JSON.parse(data)
          } catch (_) {}
          resolve({ statusCode: res.statusCode, headers: res.headers, body })
        })
      })

    req.on('error', err => { span.end(); reject(err) })
    req.end()
  })
}

// Health check
app.get('/health', (req, res) => {
  req.span.setAttributes({ endpoint: 'health', 'upstream.healthy': true })
  req.span.end()
  res.json({ service: 'upstream-service', status: 'healthy', timestamp: new Date().toISOString(), port: PORT })
})

// Trace propagation demo → RDCP discovery
app.get('/api/demo/rdcp-discovery', async (req, res) => {
  try {
    req.span.setAttributes({ endpoint: 'rdcp-discovery', 'demo.type': 'trace-propagation' })
    const result = await downstream('/.well-known/rdcp', req.ctx)
    req.span.setAttributes({ 'downstream.status': result.statusCode, 'rdcp.protocol': result.body?.protocol })
    req.span.end()
    res.json({ upstream: 'upstream-service', downstream: result, traceDemo: 'Check Jaeger for trace propagation', jaegerUrl: 'http://localhost:16686' })
  } catch (e) {
    req.span.end()
    res.status(500).json({ error: 'Downstream service unavailable', message: e.message })
  }
})

// Multi-call demo (discovery → health → status)
app.get('/api/demo/multi-call', async (req, res) => {
  try {
    req.span.setAttributes({ endpoint: 'multi-call', 'demo.type': 'complex-trace-propagation' })
    const discovery = await downstream('/.well-known/rdcp', req.ctx)
    const health = await downstream('/rdcp/v1/health', req.ctx)
    const status = await downstream('/rdcp/v1/status', req.ctx)
    req.span.setAttributes({ 'multi_call.total_calls': 3 })
    req.span.end()
    res.json({ upstream: 'upstream-service', operation: 'multi-call-demo', calls: [
      { endpoint: '/.well-known/rdcp', status: discovery.statusCode },
      { endpoint: '/rdcp/v1/health', status: health.statusCode },
      { endpoint: '/rdcp/v1/status', status: status.statusCode }
    ], jaegerUrl: 'http://localhost:16686' })
  } catch (e) {
    req.span.end()
    res.status(500).json({ error: 'Multi-call operation failed', message: e.message })
  }
})

// Error handler (fallback)
app.use((err, req, res, next) => {
  if (req && req.span) req.span.end()
  res.status(500).json({ error: 'Internal server error', service: 'upstream-service' })
})

process.on('SIGTERM', () => process.exit(0))

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Upstream Service: http://localhost:${PORT} → demo endpoints: /api/demo/rdcp-discovery, /api/demo/multi-call (Jaeger: http://localhost:16686)`) 
  })
}

module.exports = app
