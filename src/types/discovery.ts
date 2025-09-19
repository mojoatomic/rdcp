import { RDCPBase, SecurityLevel } from './base'

// Protocol Discovery Response (/.well-known/rdcp)
export interface ProtocolDiscovery extends RDCPBase {
  endpoints: {
    discovery: string
    control: string
    status: string
    health: string
  }
  capabilities: {
    multiTenancy: boolean
    performanceMetrics: boolean
    temporaryControls: boolean
    auditTrail: boolean
  }
  security: {
    level: SecurityLevel
    methods: string[]
    scopes: string[]
    required: boolean
    keyRotation?: boolean
    tokenRefresh?: boolean
  }
}
