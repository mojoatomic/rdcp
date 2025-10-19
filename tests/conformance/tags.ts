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

function getRunConfig() {
  const file = 'reports/rdcp.run.json'
  try {
    const txt = fs.readFileSync(file, 'utf8')
    return JSON.parse(txt)
  } catch {
    return { includeTags: [], excludeTags: [] }
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
      'rate-limit',
      'jwks',
      'control',
      'put',
      'schema',
      'client',
      'metrics',
      'bearer',
      'api-key',
      'mtls',
      'hybrid',
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
  if (caps.performanceMetrics) allowed.add('metrics')
  // auth method tags
  const methods = Array.isArray(d.security?.methods) ? d.security.methods : []
  methods.forEach((m: string) => {
    if (m === 'bearer') allowed.add('bearer')
    if (m === 'api-key') allowed.add('api-key')
    if (m === 'mtls') allowed.add('mtls')
    if (m === 'hybrid') allowed.add('hybrid')
  })
  // control/put are generally supported by the SDK; keep enabled by default
  ;['control', 'put', 'schema', 'client'].forEach(t => allowed.add(t))
  return allowed
}

export function withTags(tags: string[], fn: () => void) {
  try {
    const allowed = allowedTags()
    const run = getRunConfig()
    const include = new Set<string>((run.includeTags || []).map(String))
    const exclude = new Set<string>((run.excludeTags || []).map(String))

    // Skip if any required tag not allowed by discovery
    for (const t of tags) {
      if (!allowed.has(t)) return // skip block
    }
    // Include filter: if provided, require at least one overlap
    if (include.size > 0) {
      let match = false
      for (const t of tags)
        if (include.has(t)) {
          match = true
          break
        }
      if (!match) return
    }
    // Exclude filter: skip if any excluded tag present
    for (const t of tags) if (exclude.has(t)) return
  } catch {
    // On failure, do not block tests
  }
  return fn()
}
