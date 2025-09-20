import os from 'os'
import fs from 'fs'
import path from 'path'
import { RDCPServer } from '../src/server/index.js'

function readAllLogs(dir: string) {
  return fs
    .readdirSync(dir)
    .filter(f => f.startsWith('audit.log'))
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('')
}

describe('RDCPServer audit sampling and redaction', () => {
  test('redaction is applied to audit records', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdcp-audit-redact-'))
    const filePath = path.join(dir, 'audit.log')

    const server = new RDCPServer({
      capabilities: {
        audit: {
          enabled: true,
          sink: 'file',
          file: { path: filePath, maxBytes: 1024 * 1024, maxFiles: 2 },
          sampleRate: 1,
          redact: r => ({ ...r, categories: ['REDACTED'] }),
        },
      },
      random: () => 0, // deterministic sampling
    })

    const tenant = { tenantId: 't', isolationLevel: 'organization' as const }
    await server.handleControl({ action: 'enable', categories: ['API_ROUTES'] }, tenant)

    const content = readAllLogs(dir)
    expect(content).toContain('REDACTED')
    expect(content).not.toContain('API_ROUTES')
  })

  test('sampleRate=0 writes nothing', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdcp-audit-sample-'))
    const filePath = path.join(dir, 'audit.log')

    const server = new RDCPServer({
      capabilities: {
        audit: {
          enabled: true,
          sink: 'file',
          file: { path: filePath, maxBytes: 1024 * 1024, maxFiles: 2 },
          sampleRate: 0,
        },
      },
      random: () => 1, // always fail sampling
    })

    const tenant = { tenantId: 't', isolationLevel: 'organization' as const }
    await server.handleControl({ action: 'enable', categories: ['API_ROUTES'] }, tenant)

    // no base file should exist or be empty
    const exists = fs.existsSync(filePath)
    if (exists) {
      const stat = fs.statSync(filePath)
      expect(stat.size).toBe(0)
    } else {
      expect(exists).toBe(false)
    }
  })
})
