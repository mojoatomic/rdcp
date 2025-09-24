import { RDCPBase, HealthStatus, ComponentStatus } from './base'

export interface CategoryStatus {
  enabled: boolean
  metrics: {
    callsLastMinute: number
    callsTotal: number
    lastActivity: string
  }
}

export interface StatusResponse extends RDCPBase {
  timestamp: string
  categories: Record<string, CategoryStatus>
}

export interface HealthResponse extends RDCPBase {
  status: HealthStatus
  timestamp: string
  components: {
    debugSystem: ComponentStatus
    persistence: ComponentStatus
  }
}