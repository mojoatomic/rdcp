// Tags helper (placeholder) - future: integrate discovery-driven gating
// Usage idea:
//   import { withTags } from './tags'
//   withTags(['standard','jwt','control'], () => {
//     test('...', () => {...})
//   })
import fs from 'node:fs'

function getDiscovery() {
  const file = process.env.RDCP_DISCOVERY_FILE || 'reports/rdcp.discovery.json'
  try {
    const txt = fs.readFileSync(file, 'utf8')
    return JSON.parse(txt)
  } catch {
    return null
  }
}

function allowedTags() {
  const d = getDiscovery()
  const allowed = new Set<string>()
  if (!d || !d.security) {
    // Unknown environment: allow everything
    return new Set<string>([
      'basic',
      'standard',
      'enterprise',
      'tenant',
      'ttl',
      'audit',
      'ratelimit',
      'jwks',
      'control',
      'put',
      'schema',
      'client',
    ])
  }
  const level = String(d.security.level || 'basic')
  if (level === 'enterprise') {
    allowed.add('enterprise')
    allowed.add('standard')
    allowed.add('basic')
  } else if (level === 'standard') {
    allowed.add('standard')
    allowed.add('basic')
  } else {
    allowed.add('basic')
  }
  const caps = d.capabilities || {}
  if (caps.multiTenancy) allowed.add('tenant')
  if (caps.temporaryControls) allowed.add('ttl')
  if (caps.auditTrail) allowed.add('audit')
  if (caps.performanceMetrics)
    allowed.add('metrics')
    // control/put are generally supported by the SDK; keep enabled by default
  ;['control', 'put', 'schema', 'client'].forEach(t => allowed.add(t))
  return allowed
}

export function withTags(tags: string[], fn: () => void) {
  try {
    const allowed = allowedTags()
    const required = new Set<string>(tags)
    for (const t of required) {
      if (!allowed.has(t)) return // skip block
    }
  } catch {
    // On failure, do not block tests
  }
  return fn()
}
