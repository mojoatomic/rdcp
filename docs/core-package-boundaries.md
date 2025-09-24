# @rdcp.dev/core package boundaries

Purpose

- Provide a single, framework-agnostic source of truth for RDCP protocol types
- Eliminate duplicate type definitions across server/client/agents
- Keep server implementation details decoupled from protocol surface

Boundaries

- Types only, no runtime code
- No Node.js, DOM, or framework dependencies
- No imports from @rdcp.dev/server (or adapters)
- Stable union types for error codes and protocol fields; no any types

Import guidance

- Prefer importing shared RDCP protocol types from @rdcp.dev/core
- Keep server-specific utilities in @rdcp.dev/server
- If a utility is broadly useful and has no runtime/platform coupling, consider promoting it here (in a later PR)

Example

```ts
import type { ControlRequest, RDCPErrorCode } from '@rdcp.dev/core'

export function validate(req: ControlRequest): RDCPErrorCode | undefined {
  //... validate against protocol-specified fields
  return undefined
}
```

Related docs

- packages/rdcp-core/README.md (package overview)
- docs/rdcp-protocol-specification.md (protocol spec)
