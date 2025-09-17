import { z } from 'zod'

// RDCP Protocol base schemas
export const protocolVersionSchema = z.literal('rdcp/1.0')

// Control endpoint schemas
export const controlRequestSchema = z.object({
  action: z.enum(['enable', 'disable', 'toggle', 'reset']),
  categories: z.union([z.string(), z.array(z.string())]),
  options: z.object({
    temporary: z.boolean().optional(),
    duration: z.number().optional(),
    reason: z.string().optional()
  }).optional()
})

export const controlResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: z.string(),
  action: z.string(),
  categories: z.array(z.string()),
  status: z.enum(['success', 'partial', 'failed']),
  message: z.string().optional(),
  changes: z.array(z.object({
    category: z.string(),
    enabled: z.boolean(),
    temporary: z.boolean().optional(),
    expiresAt: z.string().optional()
  })).optional()
})

// Discovery endpoint schemas
export const discoveryResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: z.string(),
  categories: z.array(z.object({
    name: z.string(),
    description: z.string(),
    enabled: z.boolean(),
    temporary: z.boolean().optional(),
    metrics: z.object({
      callsTotal: z.number(),
      callsPerSecond: z.number()
    }).optional()
  })),
  performance: z.object({
    totalCalls: z.number(),
    callsPerSecond: z.number(),
    categoryBreakdown: z.record(z.number())
  })
})

// Status endpoint schemas
export const statusResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: z.string(),
  enabled: z.boolean(),
  categories: z.record(z.boolean()),
  performance: z.object({
    totalCalls: z.number(),
    callsPerSecond: z.number()
  })
})

// Health endpoint schemas
export const healthResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: z.string(),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  checks: z.array(z.object({
    name: z.string(),
    status: z.enum(['pass', 'warn', 'fail']),
    duration: z.string().optional(),
    output: z.string().optional()
  }))
})

// Protocol discovery schemas
export const protocolDiscoverySchema = z.object({
  protocol: protocolVersionSchema,
  endpoints: z.object({
    discovery: z.string(),
    control: z.string(),
    status: z.string(),
    health: z.string()
  }),
  capabilities: z.object({
    multiTenancy: z.boolean(),
    performanceMetrics: z.boolean(),
    temporaryControls: z.boolean(),
    auditTrail: z.boolean()
  }),
  security: z.object({
    level: z.enum(['basic', 'standard', 'enterprise']),
    methods: z.array(z.string()),
    scopes: z.array(z.string()),
    required: z.boolean(),
    keyRotation: z.boolean().optional(),
    tokenRefresh: z.boolean().optional()
  })
})

// Base error schema
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    protocol: protocolVersionSchema
  })
})

// Type exports
export type ControlRequest = z.infer<typeof controlRequestSchema>
export type ControlResponse = z.infer<typeof controlResponseSchema>
export type DiscoveryResponse = z.infer<typeof discoveryResponseSchema>
export type StatusResponse = z.infer<typeof statusResponseSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
export type ProtocolDiscoveryResponse = z.infer<typeof protocolDiscoverySchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>

// Safe validation helper
export function safeValidate<T>(data: unknown, schema: z.ZodSchema<T>): { success: boolean; data?: T; error?: string } {
  try {
    return { success: true, data: schema.parse(data) }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Validation failed' }
  }
}