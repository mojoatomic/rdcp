import { Request, Response } from 'express'
import { enableDebugCategories, disableDebugCategories, DEBUG_CONFIG } from '../debug'
import { controlRequestSchema } from '../schemas'

export function runtimeControl(req: Request, res: Response): void {
  try {
    const request = controlRequestSchema.parse(req.body)
    const requestId = `req_${Date.now()}`
    const timestamp = new Date().toISOString()
    const changes = []
    
    const categories = Array.isArray(request.categories) ? request.categories : [request.categories]
    
    switch (request.action) {
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
    
    res.json({
      protocol: 'rdcp/1.0',
      requestId,
      success: true,
      changes
    })
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'RDCP_VALIDATION_ERROR',
        message: 'Request validation failed',
        protocol: 'rdcp/1.0'
      }
    })
  }
}