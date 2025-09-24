import { Router, Response } from 'express'
import { RDCPRequest } from './middleware'
import { validateRDCPRequest } from './validation'
import { PROTOCOL_VERSION, RDCP_PATHS } from '@rdcp.dev/core'

export function createRDCPEndpoints(): Router {
  const router = Router()

  router.get(RDCP_PATHS.WELL_KNOWN_RDCP, (req: RDCPRequest, res: Response) => {
    res.json({
      protocol: PROTOCOL_VERSION,
      endpoints: {
        control: RDCP_PATHS.CONTROL,
        status: RDCP_PATHS.STATUS,
      },
    })
  })

  router.post(RDCP_PATHS.CONTROL, (req: RDCPRequest, res: Response) => {
    try {
      const request = validateRDCPRequest(req.body)
      res.json({
        protocol: PROTOCOL_VERSION,
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
