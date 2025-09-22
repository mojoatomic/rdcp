import crypto from 'crypto'
import jwt, { JwtPayload, JwtHeader, VerifyOptions, Algorithm } from 'jsonwebtoken'

// Types for JWT keys
export type JwtAlg = 'HS256' | 'RS256' | 'ES256' | string

export interface JwtSigningKey {
  kid: string
  alg: JwtAlg
  // For MVP we support symmetric secrets; asymmetric can be added later
  secret: string
}

export interface PreviousJwtKey {
  key: JwtSigningKey
  retirementAt: Date
}

export interface ApiKeyRecord {
  keyId: string
  hash: string
  salt: string
  kdf: 'scrypt'
  createdAt: Date
  retiredAt?: Date
}

export interface PreviousApiKeyRecord {
  key: ApiKeyRecord
  retirementAt: Date
}

export interface KeyringConfig {
  jwt: {
    active: JwtSigningKey[]
    previous: PreviousJwtKey[]
    graceWindowMs: number
  }
  api: {
    active: ApiKeyRecord[]
    previous: PreviousApiKeyRecord[]
    graceWindowMs: number
  }
}

export interface VerifyJwtResultOk {
  ok: true
  header: JwtHeader
  payload: JwtPayload | string
}

export interface VerifyJwtResultErr {
  ok: false
  error: { code: 'RDCP_JWT_KEY_NOT_FOUND' | 'RDCP_JWT_INVALID'; message: string }
}

export type VerifyJwtResult = VerifyJwtResultOk | VerifyJwtResultErr

export interface Keyring {
  verifyJwt: (
    token: string,
    options?: Pick<VerifyOptions, 'algorithms' | 'audience' | 'issuer'>
  ) => Promise<VerifyJwtResult>
  issueApiKey: (opts?: { prefix?: string }) => Promise<{ keyId: string; key: string }>
  verifyApiKey: (cleartext: string) => Promise<boolean>
}

function now(): number {
  return Date.now()
}

function inGraceWindow(retirementAt: Date): boolean {
  return retirementAt.getTime() > now()
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function scryptHash(secret: string, salt: string): string {
  const key = crypto.scryptSync(secret, salt, 32)
  return key.toString('hex')
}

export function createKeyring(initial: KeyringConfig): Keyring {
  const state: KeyringConfig = {
    jwt: {
      active: [...initial.jwt.active],
      previous: [...initial.jwt.previous],
      graceWindowMs: initial.jwt.graceWindowMs,
    },
    api: {
      active: [...initial.api.active],
      previous: [...initial.api.previous],
      graceWindowMs: initial.api.graceWindowMs,
    },
  }

  async function verifyJwt(
    token: string,
    options?: Pick<VerifyOptions, 'algorithms' | 'audience' | 'issuer'>
  ): Promise<VerifyJwtResult> {
    const decoded = jwt.decode(token, { complete: true }) as
      | { header: JwtHeader; payload: JwtPayload | string }
      | null
    if (!decoded || !decoded.header) {
      return { ok: false, error: { code: 'RDCP_JWT_INVALID', message: 'Invalid token' } }
    }
    const kid = decoded.header.kid
    let selected: JwtSigningKey | undefined

    if (kid) {
      selected = state.jwt.active.find(k => k.kid === kid)
      if (!selected) {
        const prev = state.jwt.previous.find(p => p.key.kid === kid && inGraceWindow(p.retirementAt))
        if (prev) selected = prev.key
      }
    }

    if (!selected) {
      return {
        ok: false,
        error: { code: 'RDCP_JWT_KEY_NOT_FOUND', message: 'Signing key not found or retired' },
      }
    }

    try {
      const verifyOpts: VerifyOptions = {
        algorithms: options?.algorithms ?? [selected.alg as Algorithm],
        audience: options?.audience,
        issuer: options?.issuer,
      }
      const payload = jwt.verify(token, selected.secret, verifyOpts)
      return { ok: true, header: decoded.header, payload }
    } catch (e) {
      return { ok: false, error: { code: 'RDCP_JWT_INVALID', message: 'Signature verification failed' } }
    }
  }

  async function issueApiKey(opts?: { prefix?: string }): Promise<{ keyId: string; key: string }> {
    const prefix = opts?.prefix ?? 'rdcp_sk_'
    const random = crypto.randomBytes(24).toString('base64url')
    const key = `${prefix}${random}`
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = scryptHash(key, salt)
    const keyId = sha256Hex(key).slice(0, 16)
    const rec: ApiKeyRecord = {
      keyId,
      hash,
      salt,
      kdf: 'scrypt',
      createdAt: new Date(),
    }
    state.api.active.push(rec)
    return { keyId, key }
  }

  async function verifyApiKey(cleartext: string): Promise<boolean> {
    // Identify by prefix and length, then compare hashes timing-safe
    const candidateId = sha256Hex(cleartext).slice(0, 16)
    const rec = state.api.active.find(r => r.keyId === candidateId)
    if (!rec) {
      // try previous in grace
      const prev = state.api.previous.find(p => p.key.keyId === candidateId && inGraceWindow(p.retirementAt))
      if (!prev) return false
      const h = scryptHash(cleartext, prev.key.salt)
      return timingSafeEqualStr(h, prev.key.hash)
    }
    const hash = scryptHash(cleartext, rec.salt)
    return timingSafeEqualStr(hash, rec.hash)
  }

  return {
    verifyJwt,
    issueApiKey,
    verifyApiKey,
  }
}