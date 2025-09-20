import os from 'os'
import fs from 'fs'
import path from 'path'
import { FileAuditSink } from '../src/server/audit.js'

describe('FileAuditSink', () => {
  test('writes records and rotates by size', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdcp-audit-test-'))
    const filePath = path.join(dir, 'audit.log')

    const sink = new FileAuditSink({ path: filePath, maxBytes: 200, maxFiles: 3 })

    for (let i = 0; i < 100; i++) {
      sink.write({
        event: 'RDCP_AUDIT',
        timestamp: new Date().toISOString(),
        action: 'enable',
        categories: ['API_ROUTES'],
        tenantId: 't',
        status: 'success',
      })
    }

    // ensure base file exists
    expect(fs.existsSync(filePath)).toBe(true)
    // expect some rotated files present
    const files = fs.readdirSync(dir).filter(f => f.startsWith('audit.log'))
    expect(files.length).toBeGreaterThan(1)
  })
})
