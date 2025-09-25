import {
  createRDCPClient,
  RDCPClientError,
} from '../packages/rdcp-client/src/index'

function makeFetch(
  status: number,
  body: unknown,
  contentType = 'application/json'
): typeof fetch {
  const f: typeof fetch = async (
    _input: RequestInfo | URL,
    _init?: RequestInit
  ): Promise<Response> => {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Map<string, string>([
        ['content-type', contentType],
      ]) as unknown as Headers,
      async text() {
        return contentType.includes('application/json')
          ? JSON.stringify(body)
          : String(body)
      },
    } as unknown as Response
  }
  return f
}

describe('RDCP Client SDK', () => {
  const baseUrl = 'http://localhost:3000'

  test('maps RDCP error response into RDCPClientError with code and status', async () => {
    const errorBody = {
      error: {
        code: 'RDCP_FORBIDDEN',
        message: 'Forbidden',
        protocol: 'rdcp/1.0',
      },
    }
    const rdcp = createRDCPClient({ baseUrl, fetch: makeFetch(403, errorBody) })
    await expect(rdcp.getStatus()).rejects.toEqual(
      expect.objectContaining({
        constructor: RDCPClientError,
        code: 'RDCP_FORBIDDEN',
        status: 403,
      })
    )
  })

  test('throws validation error when response does not match schema', async () => {
    const invalidBody = { not: 'a-valid-status' }
    const rdcp = createRDCPClient({
      baseUrl,
      fetch: makeFetch(200, invalidBody),
    })
    await expect(rdcp.getStatus()).rejects.toEqual(
      expect.objectContaining({
        constructor: RDCPClientError,
        code: 'RDCP_VALIDATION_ERROR',
      })
    )
  })

  test('postControl validates input and throws before fetch for invalid body', async () => {
    const rdcp = createRDCPClient({ baseUrl, fetch: makeFetch(200, {}) })
    await expect(
      // @ts-expect-error missing required fields
      rdcp.postControl({ action: 'enable' })
    ).rejects.toEqual(
      expect.objectContaining({
        constructor: RDCPClientError,
        code: 'RDCP_VALIDATION_ERROR',
        status: 0,
      })
    )
  })
})
