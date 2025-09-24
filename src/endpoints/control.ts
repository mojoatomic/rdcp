import { Request, Response } from 'express'
import {
  enableDebugCategories,
  disableDebugCategories,
  DEBUG_CONFIG,
} from '../debug'
import { controlRequestSchema } from '../schemas'
import {
  extractTenantContext,
  createTenantResponse,
  getTenantDebugConfig,
} from '../utils/tenant.js'
import { createControlResponse } from '../validation/response.js'
import { ControlChange } from '../utils/types.js'

type RequestWithRDCPAuth = Request & {
  rdcpAuth?: { user?: string; method?: string }
}

export function runtimeControl(req: Request, res: Response): void {
  try {
    const tenantContext = extractTenantContext(req)
    const request = controlRequestSchema.parse(req.body)
    const timestamp = new Date().toISOString()
    const changes: ControlChange[] = []

    const categories = Array.isArray(request.categories)
      ? request.categories
      : [request.categories]

    switch (request.action) {
      case 'enable':
        enableDebugCategories(categories, tenantContext?.tenantId)
        changes.push(
          ...categories.map(cat => ({
            category: cat,
            previousState: false,
            newState: true,
            effectiveAt: timestamp,
          }))
        )
        break

      case 'disable':
        disableDebugCategories(categories, tenantContext?.tenantId)
        changes.push(
          ...categories.map(cat => ({
            category: cat,
            previousState: true,
            newState: false,
            effectiveAt: timestamp,
          }))
        )
        break

      case 'reset': {
        const debugConfig = tenantContext
          ? getTenantDebugConfig(tenantContext.tenantId)
          : DEBUG_CONFIG
        disableDebugCategories(
          Object.keys(debugConfig),
          tenantContext?.tenantId
        )
        changes.push({
          category: 'ALL',
          previousState: true,
          newState: false,
          effectiveAt: timestamp,
        })
        break
      }

      case 'status': {
        // No state change; respond with success and no changes
        break
      }

      // Optional: unsupported actions fall through
      default:
        break
    }

    const response = createControlResponse(
      request.action,
      categories,
      'success',
      changes
    )

    res.json(
      tenantContext ? createTenantResponse(response, tenantContext) : response
    )
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'RDCP_VALIDATION_ERROR',
        message: 'Request validation failed',
        protocol: 'rdcp/1.0',
      },
    })
  }
}
