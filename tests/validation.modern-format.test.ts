import { controlRequestSchema } from '../packages/rdcp-core/src/schemas'

describe('RDCP controlRequestSchema - modern format', () => {
  test('accepts {key,value,options}', () => {
    const req = {
      key: 'DATABASE',
      value: true,
      options: { temporary: true, duration: '5s' },
    }
    const parsed = controlRequestSchema.parse(req)
    expect('key' in parsed).toBe(true)
  })
})
