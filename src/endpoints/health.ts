import { Request, Response } from 'express'

export function healthCheck(req: Request, res: Response): void {
  res.json({
    protocol: 'rdcp/1.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      debugSystem: 'operational',
      persistence: 'operational'
    }
  })
}