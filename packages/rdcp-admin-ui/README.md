# @rdcp.dev/admin-ui (headless)

Headless builder that turns RDCP discovery (+optional `ui` metadata) into an Admin UI spec.

- Input: Discovery response (and optional `ui` block)
- Output: `AdminUISpec` with groups + widgets (ToggleGroup, DurationInput, TenantSelect, StatusPanel, SubmitBar)

P0 goals
- Provide a deterministic mapping (discovery/ui → spec)
- Keep it framework-agnostic
- Add tests later for the mapping rules

Usage (illustrative)
```ts path=null start=null
import { createAdminUISpec } from '@rdcp.dev/admin-ui'
import { getDiscovery } from '@rdcp.dev/client'

const discovery = await getDiscovery()
const ui = discovery.ui // when present
const spec = createAdminUISpec(discovery, ui)
```
