import { z } from 'zod'

// Basic validation schemas matching RDCP spec
export const controlRequestSchema = z.object({
  action: z.enum(['enable', 'disable', 'toggle', 'reset']),
  categories: z.union([z.string(), z.array(z.string())]),
  options: z.object({
    temporary: z.boolean().optional(),
    duration: z.number().optional(),
    reason: z.string().optional()
  }).optional()
})

export const protocolDiscoverySchema = z.object({
  protocol: z.literal('rdcp/1.0'),
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