// Next.js App Router: app/rdcp/v1/status/route.ts
// Status Monitoring endpoint - copy this to your Next.js app
// IMPORTANT: Use relative imports, no @/ imports in API routes

import { validateRDCPAuth } from '../../src/auth'
import { getDebugStatus, getPerformanceMetrics } from '../../src/debug'

// Helper to convert Next.js Web API Request to Express-compatible request
function createExpressCompatibleRequest(request: Request) {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })
  return {
    headers,
    get: (name: string) => headers[name.toLowerCase()],
    header: (name: string) => headers[name.toLowerCase()]
  } as any // Type assertion needed for Next.js Web API compatibility
}

export async function GET(request: Request): Promise<Response> {
  const expressRequest = createExpressCompatibleRequest(request)
  const auth = validateRDCPAuth(expressRequest)
  if (!auth.valid) {
    return Response.json(
      { error: { code: 'RDCP_AUTH_FAILED', message: 'Authentication failed', protocol: 'rdcp/1.0' }},
      { status: 401 }
    )
  }

  const status = getDebugStatus()
  const metrics = getPerformanceMetrics()
  const categories: Record<string, unknown> = {}

  Object.keys(status).forEach(key => {
    if (status[key as keyof typeof status]) {
      categories[key] = {
        enabled: true,
        metrics: {
          callsLastMinute: 0,
          callsTotal: metrics.categoryBreakdown[key] || 0,
          lastActivity: new Date().toISOString()
        }
      }
    }
  })

  return Response.json({
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString(),
    categories
  })
}

// ===================================================================
// Next.js App Router: app/rdcp/v1/health/route.ts  
// Health Check endpoint - copy this to your Next.js app

export async function GET_HEALTH(): Promise<Response> {
  return Response.json({
    protocol: 'rdcp/1.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      debugSystem: 'operational',
      persistence: 'operational'
    }
  })
}