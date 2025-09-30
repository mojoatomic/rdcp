/* eslint-env jest */
/* eslint-disable no-undef, @typescript-eslint/no-unsafe-member-access */
import {
  controlRequestSchema,
  discoveryResponseSchema,
  statusResponseSchema,
  errorResponseSchema,
} from '../src/schemas'

// Jest tests for strict validation

describe('Strict data types validation', () => {
  describe('Timestamp', () => {
    const good = '2025-09-17T10:30:00.000Z'
    const badNoMillis = '2025-09-17T10:30:00Z'
    const badOffset = '2025-09-17T10:30:00.000+01:00'

    it('accepts timestamp with milliseconds and Z', () => {
      const res = statusResponseSchema.safeParse({
        protocol: 'rdcp/1.0',
        timestamp: good,
      })
      expect(res.success).toBe(true)
    })

    it('rejects timestamp without milliseconds', () => {
      const res = statusResponseSchema.safeParse({
        protocol: 'rdcp/1.0',
        timestamp: badNoMillis,
      })
      expect(res.success).toBe(false)
    })

    it('rejects timestamp with timezone offsets', () => {
      const res = statusResponseSchema.safeParse({
        protocol: 'rdcp/1.0',
        timestamp: badOffset,
      })
      expect(res.success).toBe(false)
    })
  })

  describe('Duration', () => {
    it('accepts numeric seconds', () => {
      const res = controlRequestSchema.safeParse({
        action: 'enable',
        categories: 'DATABASE',
        options: { duration: 900 },
      })
      expect(res.success).toBe(true)
    })

    it('accepts string duration in s|m|h|d', () => {
      const res = controlRequestSchema.safeParse({
        action: 'enable',
        categories: 'DATABASE',
        options: { duration: '15m' },
      })
      expect(res.success).toBe(true)
    })

    it('rejects malformed duration strings', () => {
      const res = controlRequestSchema.safeParse({
        action: 'enable',
        categories: 'DATABASE',
        options: { duration: '15min' },
      })
      expect(res.success).toBe(false)
    })
  })

  describe('CategoryName and CategoryList uniqueness', () => {
    it('accepts valid category name', () => {
      const res = controlRequestSchema.safeParse({
        action: 'enable',
        categories: 'DATABASE',
      })
      expect(res.success).toBe(true)
    })

    it('rejects lowercase category', () => {
      const res = controlRequestSchema.safeParse({
        action: 'enable',
        categories: 'database',
      })
      expect(res.success).toBe(false)
    })

    it('rejects duplicate categories in array', () => {
      const res = controlRequestSchema.safeParse({
        action: 'enable',
        categories: ['DATABASE', 'DATABASE'],
      })
      expect(res.success).toBe(false)
    })
  })

  describe('Discovery metrics and performance numbers', () => {
    const base = {
      protocol: 'rdcp/1.0',
      timestamp: '2025-09-17T10:30:00.000Z',
      categories: [
        {
          name: 'DATABASE',
          description: 'db',
          enabled: true,
          metrics: { callsTotal: 10, callsPerSecond: 0.5 },
        },
      ],
      performance: {
        totalCalls: 10,
        callsPerSecond: 0.5,
        categoryBreakdown: { DATABASE: 10 },
      },
    }

    it('accepts non-negative counters and rates', () => {
      const res = discoveryResponseSchema.safeParse(base)
      expect(res.success).toBe(true)
    })

    it('rejects negative counter', () => {
      const bad = JSON.parse(JSON.stringify(base))
      bad.performance.totalCalls = -1
      const res = discoveryResponseSchema.safeParse(bad)
      expect(res.success).toBe(false)
    })
  })

  describe('ErrorCode strict pattern', () => {
    it('accepts uppercase underscore codes', () => {
      const res = errorResponseSchema.safeParse({
        error: { code: 'UNAUTHORIZED', message: 'x', protocol: 'rdcp/1.0' },
      })
      expect(res.success).toBe(true)
    })

    it('rejects lowercase codes', () => {
      const res = errorResponseSchema.safeParse({
        error: { code: 'unauthorized', message: 'x', protocol: 'rdcp/1.0' },
      })
      expect(res.success).toBe(false)
    })
  })
})
