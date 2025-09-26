import { describe, test, expect } from '@jest/globals'
import { createAdminUISpec } from '../src/index'
import type { DiscoveryLike, UIBlock } from '../src/types'

const discovery: DiscoveryLike = {
  protocol: 'rdcp/1.0',
  categories: [
    { name: 'API_ROUTES', description: 'HTTP routes', enabled: false },
    { name: 'DATABASE', description: 'SQL debug', enabled: false },
  ],
  performance: { totalCalls: 0, callsPerSecond: 0, categoryBreakdown: {} },
}

describe('admin-ui builder', () => {
  test('defaults to single group with all categories; no TTL widget without constraints', () => {
    const spec = createAdminUISpec(discovery)
    expect(spec.groups.length).toBe(1)
    expect(spec.groups[0].id).toBe('default')
    const widgets = spec.groups[0].widgets
    const hasToggle = widgets.some(w => w.type === 'ToggleGroup')
    const hasDuration = widgets.some(w => w.type === 'DurationInput')
    const toggle = widgets.find(w => w.type === 'ToggleGroup') as {
      type: 'ToggleGroup'
      categories: string[]
    }
    expect(hasToggle).toBe(true)
    expect(hasDuration).toBe(false)
    expect(toggle.categories.sort()).toEqual(['API_ROUTES', 'DATABASE'].sort())
  })

  test('adds DurationInput when ttl constraints provided', () => {
    const ui: UIBlock = {
      version: '1.0',
      constraints: { ttl: { min: '30s', max: '15m', default: '2m' } },
    }
    const spec = createAdminUISpec(discovery, ui)
    const widgets = spec.groups[0].widgets
    const duration = widgets.find(w => w.type === 'DurationInput') as {
      type: 'DurationInput'
      min?: string
      max?: string
      default?: string
    }
    expect(duration).toBeDefined()
    expect(duration.min).toBe('30s')
    expect(duration.max).toBe('15m')
    expect(duration.default).toBe('2m')
  })

  test('respects provided groups and de-dupes category lists', () => {
    const ui: UIBlock = {
      version: '1.0',
      groups: [
        {
          id: 'logging',
          label: 'Logging',
          categories: ['API_ROUTES', 'API_ROUTES'],
        },
        { id: 'db', label: 'Database', categories: ['DATABASE'] },
      ],
    }
    const spec = createAdminUISpec(discovery, ui)
    expect(spec.groups.length).toBe(2)
    const logging = spec.groups.find(g => g.id === 'logging')!
    const toggle = logging.widgets.find(w => w.type === 'ToggleGroup') as {
      type: 'ToggleGroup'
      categories: string[]
    }
    expect(toggle.categories).toEqual(['API_ROUTES'])
  })
})
