/**
 * @fileoverview Express Request interface extension for RDCP authentication context
 * Follows Context7 TypeScript patterns - no any types allowed per WARP.md
 */

import type { RDCPAuthResult } from '../../src/auth/types.js'

declare global {
  namespace Express {
    interface Request {
      rdcpAuth?: RDCPAuthResult
    }
  }
}