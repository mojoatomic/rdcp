// Next.js App Router: app/rdcp/v1/discovery/route.ts
// Debug System Discovery endpoint - copy this to your Next.js app
// IMPORTANT: Use relative imports, no @/ imports in API routes

import { validateRDCPAuth } from '../../../../src/auth' // Adjust path as needed
import { DEBUG_CONFIG, getPerformanceMetrics } from '../../../../src/debug' // Adjust path as needed

export async function GET(request: Request): Promise<Response> {
  // RDCP authentication
  const auth = validateRDCPAuth(request)
  if (!auth.valid) {
    return Response.json(
      {
        error: {
          code: 'RDCP_AUTH_FAILED',
          message: 'Authentication failed',
          protocol: 'rdcp/1.0'
        }
      },
      { status: 401 }
    )
  }

  // Get debug categories from debug engine
  const categories = Object.keys(DEBUG_CONFIG).map(id => ({
    id,
    enabled: DEBUG_CONFIG[id as keyof typeof DEBUG_CONFIG],
    description: `Debug logging for ${id.toLowerCase().replace('_', ' ')}`,
    tags: ['debug']
  }))

  const metrics = getPerformanceMetrics()

  return Response.json({
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString(),
    categories,
    performance: {
      overhead: {
        cpu: {
          value: 0.1,
          unit: 'percent',
          measured: false
        },
        memory: {
          value: 1048576,
          unit: 'bytes',
          measured: false
        }
      }
    }
  })
}