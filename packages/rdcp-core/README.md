# @rdcp.dev/core

Protocol types for RDCP shared across server and client packages.

What this package contains
- Stable protocol-facing TypeScript types (no any types)
- Zero runtime logic (types only)
- No framework or Node.js coupling
- Minimal surface intended for broad reuse (SDKs, agents, services)

Design boundaries
- Import-only: consumers should import types from @rdcp.dev/core; no side effects
- No runtime utilities or environment-specific code
- No Node.js built-ins, no fetch/http usage, no file I/O
- No dependency on @rdcp.dev/server or any adapter packages

Usage

```ts
import type { RDCPErrorCode, ControlRequest, DiscoveryDocument } from '@rdcp.dev/core'

function handleControl(req: ControlRequest): { error?: RDCPErrorCode } {
  // ... service implementation using shared protocol types
  return {}
}
```

Versioning
- Additive changes (new types/fields) follow semver minor
- Breaking type changes follow semver major
- Avoid removing/renaming existing fields; prefer deprecation comments first

Contributing
- Keep the surface minimal and focused on protocol representations
- Follow strict TypeScript: no any, prefer precise string unions and readonly where appropriate
- Align with the RDCP protocol docs (docs/rdcp-protocol-specification.md)
