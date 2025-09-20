/*
 * Audit sink interfaces for RDCP core
 */

export interface AuditRecord {
  event: 'RDCP_AUDIT'
  timestamp: string
  action: string
  categories: string[]
  tenantId: string
  status: 'success' | 'failed'
  // optional fields for future extension
  requestId?: string
  authMethod?: string
  clientId?: string
  ip?: string
}

export interface AuditSink {
  write(record: AuditRecord): void
}

export class NoopAuditSink implements AuditSink {
  write(): void {}
}

export class ConsoleAuditSink implements AuditSink {
  write(record: AuditRecord): void {
    // Keep the same event name for familiarity
    // eslint-disable-next-line no-console
    console.info('RDCP_AUDIT', JSON.stringify(record))
  }
}

import fs from 'fs'
import path from 'path'

export interface FileAuditOptions {
  path?: string
  maxBytes?: number
  maxFiles?: number
}

export class FileAuditSink implements AuditSink {
  private filePath: string
  private maxBytes: number
  private maxFiles: number

  constructor(options: FileAuditOptions = {}) {
    this.filePath =
      options.path ?? path.resolve(process.cwd(), 'rdcp-audit.log')
    this.maxBytes = options.maxBytes ?? 5 * 1024 * 1024
    this.maxFiles = options.maxFiles ?? 5
  }

  write(record: AuditRecord): void {
    try {
      this.rotateIfNeeded()
      const line = JSON.stringify(record) + '\n'
      fs.appendFileSync(this.filePath, line, { encoding: 'utf8' })
    } catch {
      // ignore write errors
    }
  }

  private rotateIfNeeded(): void {
    try {
      const stat = fs.existsSync(this.filePath)
        ? fs.statSync(this.filePath)
        : null
      if (stat && stat.size >= this.maxBytes) {
        // rotate: rename current to filePath.timestamp
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        const rotated = `${this.filePath}.${ts}`
        fs.renameSync(this.filePath, rotated)
        this.enforceRetention()
      }
    } catch {
      // ignore rotation errors
    }
  }

  private enforceRetention(): void {
    try {
      const dir = path.dirname(this.filePath)
      const base = path.basename(this.filePath)
      const files = fs
        .readdirSync(dir)
        .filter(f => f === base || f.startsWith(`${base}.`))
        .sort((a, b) => {
          return (
            fs.statSync(path.join(dir, a)).mtimeMs -
            fs.statSync(path.join(dir, b)).mtimeMs
          )
        })

      while (files.length > this.maxFiles) {
        const toRemove = files.shift()
        if (toRemove) {
          try {
            fs.unlinkSync(path.join(dir, toRemove))
          } catch {
            // ignore unlink errors
          }
        }
      }
    } catch {
      // ignore retention errors
    }
  }
}
