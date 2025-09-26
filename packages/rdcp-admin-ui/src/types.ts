export type DiscoveryCategory = {
  name: string
  description: string
  enabled: boolean
  temporary?: boolean
  metrics?: {
    callsTotal: number
    callsPerSecond: number
  }
}

export type DiscoveryLike = {
  protocol: 'rdcp/1.0'
  timestamp?: string
  categories: DiscoveryCategory[]
  performance: {
    totalCalls: number
    callsPerSecond: number
    categoryBreakdown: Record<string, number>
  }
}

export type UIGroup = {
  id: string
  label: string
  categories: string[]
}

export type UIBlock = {
  version: string
  categoryDescriptions?: Record<string, string>
  groups?: UIGroup[]
  constraints?: {
    ttl?: {
      min?: string
      max?: string
      default?: string
    }
  }
  preferredAuth?: string
  multiTenant?: boolean
}

export type Widget =
  | { type: 'ToggleGroup'; categories: string[] }
  | { type: 'DurationInput'; min?: string; max?: string; default?: string }
  | { type: 'TenantSelect'; tenants?: string[] }
  | { type: 'StatusPanel' }
  | { type: 'SubmitBar' }

export type AdminUISpec = {
  groups: {
    id: string
    label: string
    widgets: Widget[]
  }[]
}
