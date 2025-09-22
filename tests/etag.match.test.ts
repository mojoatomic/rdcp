import { describe, it, expect } from '@jest/globals'
import { etagMatches, computeStrongETagFromString } from '../src/utils/etag'

describe('etagMatches helper', () => {
  it('matches exact tag and wildcard', () => {
    const etag = computeStrongETagFromString('{}')
    expect(etagMatches(etag, etag)).toBe(true)
    expect(etagMatches('*', etag)).toBe(true)
  })

  it('does not match different tags', () => {
    const a = computeStrongETagFromString('a')
    const b = computeStrongETagFromString('b')
    expect(etagMatches(a, b)).toBe(false)
  })

  it('matches when header contains multiple tokens', () => {
    const a = computeStrongETagFromString('a')
    const b = computeStrongETagFromString('b')
    const header = `${a}, ${b}`
    expect(etagMatches(header, b)).toBe(true)
  })
})