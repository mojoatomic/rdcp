import { Router, Response } from 'express'
import { RDCPRequest } from './middleware'
import { validateRDCPRequest } from './validation'

export function createRDCPEndpoints(): Router {
  const router = Router()

  router.get('/.well-known/rdcp', (req: RDCPRequest, res: Response) => {
    res.json({
      protocol: 'rdcp/1.0',
      endpoints: {
        control: '/rdcp/v1/control',
        status: '/rdcp/v1/status',
      },
    })
  })

  router.post('/rdcp/v1/control', (req: RDCPRequest, res: Response) => {
    try {
      const request = validateRDCPRequest(req.body)
      res.json({
        protocol: 'rdcp/1.0',
        success: true,
        request,
      })
    } catch (error) {
      res.status(400).json({
        error: 'Validation failed',
      })
    }
  })

  return router
}
