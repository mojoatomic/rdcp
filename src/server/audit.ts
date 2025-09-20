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