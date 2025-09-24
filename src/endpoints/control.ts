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

      case 'toggle': {
        const debugConfig = tenantContext
          ? getTenantDebugConfig(tenantContext.tenantId)
          : DEBUG_CONFIG
        categories.forEach(cat => {
          const prev = Boolean(debugConfig[cat as keyof typeof debugConfig])
          const next = !prev
          if (tenantContext?.tenantId) {
            // Tenant-scoped toggle
            getTenantDebugConfig(tenantContext.tenantId) // ensure exists
            // Directly set via setTenantDebugCategory through enable/disable helpers
            if (next) {
              enableDebugCategories([cat], tenantContext.tenantId)
            } else {
              disableDebugCategories([cat], tenantContext.tenantId)
            }
          } else if (cat in DEBUG_CONFIG) {
            DEBUG_CONFIG[cat as keyof typeof DEBUG_CONFIG] = next
          }
          changes.push({
            category: cat,
            previousState: prev,
            newState: next,
            effectiveAt: timestamp,
          })
        })
        break
      }

      case 'reset': {
        const debugConfig = tenantContext
          ? getTenantDebugConfig(tenantContext.tenantId)
          : DEBUG_CONFIG
        const keys = Object.keys(debugConfig)
        const changed: string[] = []
        keys.forEach(cat => {
          const prev = Boolean(debugConfig[cat as keyof typeof debugConfig])
          if (prev) changed.push(cat)
        })
        disableDebugCategories(keys, tenantContext?.tenantId)
        changes.push(
          ...keys.map(cat => ({
            category: cat,
            previousState: Boolean(debugConfig[cat as keyof typeof debugConfig]),
            newState: false,
            effectiveAt: timestamp,
          }))
        )
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
