import crypto from 'crypto'

// Strong ETag computation using SHA-256 over a canonical JSON representation
// No use of 'any' types; functions operate on unknown with type guards

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function stableStringifyInternal(value: unknown): string {
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return JSON.stringify(value)
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (isArray(value)) {
    const items = value.map(v => stableStringifyInternal(v)).join(',')
    return `[${items}]`
  }
  if (isObject(value)) {
    const keys = Object.keys(value).sort()
    const parts: string[] = []
    for (const k of keys) {
      const v = (value as Record<string, unknown>)[k]
      parts.push(`${JSON.stringify(k)}:${stableStringifyInternal(v)}`)
    }
    return `{${parts.join(',')}}`
  }
  // Fallback for unsupported types: convert to string safely
  return JSON.stringify(String(value))
}

export function stableStringify(value: unknown): string {
  return stableStringifyInternal(value)
}

function base64urlSha256(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest()
  return hash
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function computeStrongETagFromString(body: string): string {
  const tag = base64urlSha256(body)
  return `"${tag}"`
}

function getKid(value: unknown): string {
  if (isObject(value) && 'kid' in value) {
    const kid = (value as Record<string, unknown>)['kid']
    if (typeof kid === 'string') return kid
  }
  return ''
}

export function canonicalizeJWKS(jwks: { keys: unknown[] }): string {
  // Sort keys array by kid for stability (fallback to empty string when absent)
  const sortedKeys = [...jwks.keys].sort((a, b) =>
    getKid(a).localeCompare(getKid(b))
  )
  const canonical = { keys: sortedKeys }
  return stableStringify(canonical)
}

export function prepareJWKSResponse(jwks: { keys: unknown[] }): {
  body: string
  etag: string
} {
  const body = canonicalizeJWKS(jwks)
  const etag = computeStrongETagFromString(body)
  return { body, etag }
}

export function etagMatches(ifNoneMatchHeader: string, etag: string): boolean {
  const header = ifNoneMatchHeader.trim()
  if (header === '*') return true
  const tokens = header.split(',').map(t => t.trim())
  return tokens.includes(etag)
}
