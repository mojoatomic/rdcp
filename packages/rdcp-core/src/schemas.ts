import { z } from 'zod'
import { PROTOCOL_VERSION } from './constants.js'

// Domain-specific primitives (strict)
const TIMESTAMP = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
const DURATION = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^[0-9]+(s|m|h|d)$/),
])
const CATEGORY_NAME = z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/)
const CATEGORY_LIST = z
  .array(CATEGORY_NAME)
  .min(1)
  .superRefine((arr, ctx) => {
    const seen = new Set<string>()
    for (const v of arr) {
      if (seen.has(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate category: ${v}`,
        })
        return
      }
      seen.add(v)
    }
  })
const ERROR_CODE = z.string().regex(/^[A-Z0-9_]{3,64}$/)
const COUNTER_NUMBER = z.number().min(0)
const RATE_NUMBER = z.number().min(0)

// Protocol version schema
export const protocolVersionSchema = z.literal(PROTOCOL_VERSION)

// Control endpoint schemas (protocol-surface only)
export const controlRequestSchema = z.object({
  action: z.enum(['enable', 'disable', 'toggle', 'reset', 'status']),
  categories: z.union([CATEGORY_NAME, CATEGORY_LIST]),
  options: z
    .object({
      temporary: z.boolean().optional(),
      duration: DURATION.optional(),
      reason: z.string().optional(),
    })
    .optional(),
})

export const controlResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: TIMESTAMP,
  action: z.enum(['enable', 'disable', 'toggle', 'reset', 'status']),
  categories: CATEGORY_LIST,
  status: z.enum(['success', 'partial', 'failed']),
  message: z.string().optional(),
  changes: z
    .array(
      z.object({
        category: CATEGORY_NAME,
        enabled: z.boolean().optional(),
        previousState: z.boolean().optional(),
        newState: z.boolean().optional(),
        temporary: z.boolean().optional(),
        expiresAt: TIMESTAMP.optional(),
        effectiveAt: TIMESTAMP.optional(),
      })
    )
    .optional(),
})

// Discovery endpoint schemas
export const discoveryResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: TIMESTAMP,
  categories: z.array(
    z.object({
      name: CATEGORY_NAME,
      description: z.string(),
      enabled: z.boolean(),
      temporary: z.boolean().optional(),
      metrics: z
        .object({
          callsTotal: COUNTER_NUMBER,
          callsPerSecond: RATE_NUMBER,
        })
        .optional(),
    })
  ),
  performance: z.object({
    totalCalls: COUNTER_NUMBER,
    callsPerSecond: RATE_NUMBER,
    categoryBreakdown: z.record(COUNTER_NUMBER),
  }),
})

// Status endpoint schemas
export const statusResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: TIMESTAMP,
  enabled: z.boolean().optional(),
  categories: z.record(z.boolean()).optional(),
  performance: z
    .object({
      totalCalls: COUNTER_NUMBER,
      callsPerSecond: RATE_NUMBER,
    })
    .optional(),
})

// Health endpoint schemas (duration uses implementation-specific ms string)
export const healthResponseSchema = z.object({
  protocol: protocolVersionSchema,
  timestamp: TIMESTAMP,
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  checks: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['pass', 'warn', 'fail']),
      duration: z.string().optional(),
      output: z.string().optional(),
    })
  ),
})

// Protocol discovery
export const protocolDiscoverySchema = z.object({
  protocol: protocolVersionSchema,
  endpoints: z.object({
    discovery: z.string(),
    control: z.string(),
    status: z.string(),
    health: z.string(),
  }),
  capabilities: z.object({
    multiTenancy: z.boolean(),
    performanceMetrics: z.boolean(),
    temporaryControls: z.boolean(),
    auditTrail: z.boolean(),
  }),
  security: z.object({
    level: z.enum(['basic', 'standard', 'enterprise']),
    methods: z.array(z.string()),
    scopes: z.array(z.string()),
    required: z.boolean(),
    keyRotation: z.boolean().optional(),
    tokenRefresh: z.boolean().optional(),
  }),
})

// Base error schema
export const errorResponseSchema = z.object({
  error: z.object({
    code: ERROR_CODE,
    message: z.string(),
    protocol: protocolVersionSchema,
  }),
})
