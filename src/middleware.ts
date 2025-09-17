import { Request, Response, NextFunction } from 'express'

export interface RDCPRequest extends Request {
  rdcp?: {
    protocol: 'rdcp/1.0'
    timestamp: string
  }
}

export function rdcpMiddleware(req: RDCPRequest, res: Response, next: NextFunction): void {
  req.rdcp = {
    protocol: 'rdcp/1.0',
    timestamp: new Date().toISOString()
  }
  
  res.setHeader('Content-Type', 'application/json')
  next()
}