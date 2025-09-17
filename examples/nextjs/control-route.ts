// Next.js App Router: app/rdcp/v1/control/route.ts
// Runtime Control endpoint - copy this to your Next.js app
// IMPORTANT: Use relative imports, no @/ imports in API routes

import { validateRDCPAuth } from '../../../../src/auth' // Adjust path as needed
import { enableDebugCategories, disableDebugCategories, DEBUG_CONFIG } from '../../../../src/debug' // Adjust path as needed
import { controlRequestSchema } from '../../../../src/schemas' // Adjust path as needed

export async function POST(request: Request): Promise<Response> {
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

  try {
    const body = await request.json()
    const controlRequest = controlRequestSchema.parse(body)
    const requestId = `req_${Date.now()}`
    const timestamp = new Date().toISOString()
    const changes = []

    const categories = Array.isArray(controlRequest.categories) 
      ? controlRequest.categories 
      : [controlRequest.categories]

    switch (controlRequest.action) {
      case 'enable':
        enableDebugCategories(categories)
        changes.push(...categories.map(cat => ({
          category: cat,
          previousState: false,
          newState: true,
          effectiveAt: timestamp
        })))
        break

      case 'disable':
        disableDebugCategories(categories)
        changes.push(...categories.map(cat => ({
          category: cat,
          previousState: true,
          newState: false,
          effectiveAt: timestamp
        })))
        break

      case 'reset':
        disableDebugCategories(Object.keys(DEBUG_CONFIG))
        changes.push({
          category: 'ALL',
          previousState: true,
          newState: false,
          effectiveAt: timestamp
        })
        break
    }

    return Response.json({
      protocol: 'rdcp/1.0',
      requestId,
      success: true,
      changes
    })
  } catch (error) {
    return Response.json(
      {
        error: {
          code: 'RDCP_VALIDATION_ERROR',
          message: 'Request validation failed',
          protocol: 'rdcp/1.0'
        }
      },
      { status: 400 }
    )
  }
}