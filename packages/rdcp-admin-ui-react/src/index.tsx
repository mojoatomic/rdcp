import * as React from 'react'
import type { AdminUISpec } from '@rdcp.dev/admin-ui/src/types'

export type ToggleGroupProps = { categories: string[]; selected: string[]; onChange: (next: string[]) => void }
export function ToggleGroup(props: ToggleGroupProps): JSX.Element {
  const { categories, selected, onChange } = props
  const onToggle = (cat: string): void => {
    const next = selected.includes(cat) ? selected.filter(c => c !== cat) : [...selected, cat]
    onChange(next)
  }
  return (
    <div data-rdcp="toggle-group">
      {categories.map(cat => (
        <label key={cat} style={{ display: 'inline-block', marginRight: 8 }}>
          <input
            type="checkbox"
            name={`category-${cat}`}
            data-category={cat}
            aria-label={`toggle ${cat}`}
            checked={selected.includes(cat)}
            onChange={() => onToggle(cat)}
          />{' '}
          {cat}
        </label>
      ))}
    </div>
  )
}

export type DurationInputProps = { min?: string | undefined; max?: string | undefined; defaultValue?: string | undefined; onChange: (value: string) => void }
export function DurationInput(props: DurationInputProps): JSX.Element {
  const { min, max, defaultValue, onChange } = props
  const [value, setValue] = React.useState<string>(defaultValue ?? '')
  return (
    <div>
      <input
        id="rdcp-duration"
        aria-label="duration"
        placeholder="e.g., 2m, 30s"
        value={value}
        onChange={e => { setValue(e.target.value); onChange(e.target.value) }}
      />
      {min || max ? <small style={{ marginLeft: 8 }}>(min {min ?? '-'}, max {max ?? '-'})</small> : null}
    </div>
  )
}

export type TenantSelectProps = { tenants?: string[] | undefined; value?: string | undefined; onChange: (tenant?: string) => void }
export function TenantSelect(props: TenantSelectProps): JSX.Element | null {
  const { tenants, value, onChange } = props
  if (!tenants || tenants.length === 0) return null
  return (
    <select id="rdcp-tenant" aria-label="tenant" value={value ?? ''} onChange={e => onChange(e.target.value || undefined)}>
      <option value="">(global)</option>
      {tenants.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}

export type StatusPanelProps = { status?: { timestamp?: string } }
export function StatusPanel(props: StatusPanelProps): JSX.Element {
  const { status } = props
  return (
    <div id="rdcp-status" data-loading="false">
      <strong>Status</strong> {status?.timestamp ? <span>({status.timestamp})</span> : <span>(idle)</span>}
    </div>
  )
}

export type SubmitBarProps = { onSubmit: () => Promise<void>; disabled?: boolean }
export function SubmitBar(props: SubmitBarProps): JSX.Element {
  const { onSubmit, disabled } = props
  const [busy, setBusy] = React.useState(false)
  const run = async (): Promise<void> => {
    setBusy(true)
    try { await onSubmit() } finally { setBusy(false) }
  }
  return (
    <div>
      <label htmlFor="rdcp-action" style={{ marginRight: 8 }}>Action</label>
      <select id="rdcp-action" aria-label="action" defaultValue="enable" style={{ marginRight: 12 }}>
        <option value="enable">enable</option>
        <option value="disable">disable</option>
        <option value="toggle">toggle</option>
        <option value="reset">reset</option>
      </select>
      <button id="rdcp-apply" onClick={run} disabled={busy || disabled}>Apply</button>
    </div>
  )
}

export type RendererProps = { spec: AdminUISpec }
export function AdminUIRenderer({ spec }: RendererProps): JSX.Element {
  return (
    <div>
      {spec.groups.map(g => (
        <section key={g.id}>
          <h2>{g.label}</h2>
          {g.widgets.map((w, i) => {
            if (w.type === 'ToggleGroup') return <ToggleGroup key={i} categories={w.categories} selected={[]} onChange={() => undefined} />
            if (w.type === 'DurationInput') return <DurationInput key={i} min={w.min} max={w.max} defaultValue={w.default} onChange={() => undefined} />
            if (w.type === 'TenantSelect') return <TenantSelect key={i} tenants={w.tenants} onChange={() => undefined} />
            if (w.type === 'StatusPanel') return <StatusPanel key={i} />
            if (w.type === 'SubmitBar') return <SubmitBar key={i} onSubmit={async () => { /* no-op*/ }} />
            return null
          })}
        </section>
      ))}
    </div>
  )
}
