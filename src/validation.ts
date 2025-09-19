import { z } from 'zod'

export const controlRequestSchema = z.object({
  action: z.enum(['enable', 'disable', 'reset']),
  categories: z.union([z.string(), z.array(z.string())]),
})

export type ControlRequest = z.infer<typeof controlRequestSchema>

export function validateRDCPRequest(data: unknown): ControlRequest {
  return controlRequestSchema.parse(data)
}
