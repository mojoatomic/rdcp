// Re-export protocol schemas from @rdcp.dev/core to maintain public API
export {
  protocolVersionSchema,
  controlRequestSchema,
  controlResponseSchema,
  discoveryResponseSchema,
  statusResponseSchema,
  healthResponseSchema,
  protocolDiscoverySchema,
  errorResponseSchema,
} from '@rdcp.dev/core'

// Local helper for safe validation (server-only utility)
import { z } from 'zod'
export function safeValidate<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; error?: z.ZodError } {
  try {
    return { success: true, data: schema.parse(data) }
  } catch (error) {
    return { success: false, error: error as z.ZodError }
  }
}
