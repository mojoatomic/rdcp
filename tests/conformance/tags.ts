// Tags helper (placeholder) - future: integrate discovery-driven gating
// Usage idea:
//   import { withTags } from './tags'
//   withTags(['standard','jwt','control'], () => {
//     test('...', () => {...})
//   })
export function withTags(_tags, fn) {
  // For now, just execute; selection will be added later
  return fn()
}
