import type { AdminUISpec, DiscoveryLike, UIBlock, UIGroup } from './types'

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function defaultGroups(categories: DiscoveryLike['categories']): UIGroup[] {
  const names = categories.map(c => c.name)
  return [{ id: 'default', label: 'Controls', categories: names }]
}

export function createAdminUISpec(
  discovery: DiscoveryLike,
  ui?: UIBlock
): AdminUISpec {
  const groups =
    ui?.groups && ui.groups.length > 0
      ? ui.groups
      : defaultGroups(discovery.categories)

  const ttl = ui?.constraints?.ttl

  return {
    groups: groups.map(g => ({
      id: g.id,
      label: g.label,
      widgets: [
        { type: 'ToggleGroup', categories: dedupe(g.categories) },
        ...(ttl
          ? ([
              {
                type: 'DurationInput',
                min: ttl.min,
                max: ttl.max,
                default: ttl.default,
              },
            ] as const)
          : []),
        { type: 'StatusPanel' },
        { type: 'SubmitBar' },
      ],
    })),
  }
}
