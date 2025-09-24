import { RDCPBase } from './base'

export interface DebugCategory {
  id: string
  enabled: boolean
  description: string
  tags?: string[]
  metrics?: {
    callsTotal: number
    callsPerSecond: number
  }
}

export interface PerformanceMetric {
  value: number
  unit: string
  measured: boolean
}

export interface DebugSystemDiscovery extends RDCPBase {
  timestamp: string
  categories: DebugCategory[]
  performance: {
    overhead: {
      cpu: PerformanceMetric
      memory: PerformanceMetric
    }
  }
}