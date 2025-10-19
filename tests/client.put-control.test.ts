import {
  createRDCPClient,
  RDCPClientError,
} from '../packages/rdcp-client/src/index'
import { controlResponseSchema } from '../packages/rdcp-core/src/schemas'

describe('RDCP Client SDK - putControl', () => {
  function makeFetchPutSuccess() {
    const f = async (
      _input: unknown,
      init?: {
        method?: string
        headers?: Record<string, string>
        body?: unknown
      }
    ) => {
      const method = (init?.method || 'GET').toUpperCase()
      if (method === 'PUT') {
        const body = {
          protocol: 'rdcp/1.0',
          timestamp: new Date().toISOString(),
          action: 'enable',
          categories: ['DATABASE'],
          status: 'success',
          changes: [{ category: 'DATABASE', newState: true }],
        }
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === 'content-type' ? 'application/json' : null,
          },
          async text() {
            return JSON.stringify(body)
          },
        }
      }
      throw new Error('unexpected method in mock')
    }
    return f as unknown as typeof fetch
  }

  function makeFetchPutThenPostFallback() {
    let called = 0
    const f = async (
      _input: unknown,
      init?: {
        method?: string
        headers?: Record<string, string>
        body?: unknown
      }
    ) => {
      called += 1
      const method = (init?.method || 'GET').toUpperCase()
      if (called === 1) {
        // First call (PUT) returns 405 to trigger fallback
        return {
          ok: false,
          status: 405,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === 'content-type' ? 'application/json' : null,
          },
          async text() {
            return JSON.stringify({
              error: {
                code: 'RDCP_INVALID_ACTION',
                message: 'Method not allowed',
                protocol: 'rdcp/1.0',
              },
            })
          },
        }
      }
      // Second call should be POST legacy body
      if (method === 'POST') {
        const body = {
          protocol: 'rdcp/1.0',
          timestamp: new Date().toISOString(),
          action: 'enable',
          categories: ['DATABASE'],
          status: 'success',
          changes: [{ category: 'DATABASE', newState: true }],
        }
        // Validate body roughly matches legacy
        try {
          const parsed = JSON.parse(
            String((init as unknown as { body?: unknown }).body || '{}')
          ) as unknown
          if (
            !(
              parsed &&
              typeof parsed === 'object' &&
              'action' in (parsed as Record<string, unknown>) &&
              'categories' in (parsed as Record<string, unknown>)
            )
          ) {
            throw new Error('invalid legacy body')
          }
        } catch {
          throw new Error('invalid legacy body')
        }
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === 'content-type' ? 'application/json' : null,
          },
          async text() {
            return JSON.stringify(body)
          },
        }
      }
      throw new Error('unexpected method in mock')
    }
    return f as unknown as typeof fetch
  }

  test('putControl succeeds on servers that support PUT {key,value}', async () => {
    const rdcp = createRDCPClient({
      baseUrl: 'http://localhost:3000',
      fetch: makeFetchPutSuccess(),
    })
    const res = await rdcp.putControl('DATABASE', true)
    const parsed = controlResponseSchema.parse(res)
    expect(parsed.status).toBe('success')
    expect(parsed.categories).toContain('DATABASE')
  })

  test('putControl falls back to POST when PUT returns 405/404/400 (boolean only)', async () => {
    const rdcp = createRDCPClient({
      baseUrl: 'http://localhost:3000',
      fetch: makeFetchPutThenPostFallback(),
    })
    const res = await rdcp.putControl('DATABASE', true)
    const parsed = controlResponseSchema.parse(res)
    expect(parsed.status).toBe('success')
    expect(parsed.categories).toContain('DATABASE')
  })

  test('putControl does not fallback for non-boolean values; propagates error', async () => {
    const fetch405 = async (_i: unknown, init?: { method?: string }) => {
      if ((init?.method || '').toUpperCase() === 'PUT') {
        return {
          ok: false,
          status: 405,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === 'content-type' ? 'application/json' : null,
          },
          async text() {
            return JSON.stringify({
              error: {
                code: 'RDCP_INVALID_ACTION',
                message: 'Method not allowed',
                protocol: 'rdcp/1.0',
              },
            })
          },
        }
      }
      throw new Error('unexpected method in mock')
    }
    const rdcp = createRDCPClient({
      baseUrl: 'http://localhost:3000',
      fetch: fetch405 as unknown as typeof fetch,
    })
    await expect(rdcp.putControl('DATABASE', 'on')).rejects.toEqual(
      expect.objectContaining({ constructor: RDCPClientError, status: 405 })
    )
  })
})
