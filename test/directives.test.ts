import { describe, expect, it } from 'vitest'

import {
  BEAM_EXACT_NAMES,
  BEAM_PREFIX_NAMES,
  BEAM_REACTIVITY_DIRECTIVES,
  isValidBeamReactivityDirective,
} from '../src/directives'

describe('reactivity directives registry', () => {
  it('contains the documented directive names', () => {
    expect(BEAM_REACTIVITY_DIRECTIVES.length).toBeGreaterThan(0)
    expect(BEAM_EXACT_NAMES.has('beam-state')).toBe(true)
    expect(BEAM_EXACT_NAMES.has('beam-model')).toBe(true)
    expect(BEAM_PREFIX_NAMES).toContain('beam-attr-')
  })

  it('validates exact and prefix directives', () => {
    expect(isValidBeamReactivityDirective('beam-text')).toBe(true)
    expect(isValidBeamReactivityDirective('beam-attr-style')).toBe(true)
    expect(isValidBeamReactivityDirective('beam-attr-aria-label')).toBe(true)
    expect(isValidBeamReactivityDirective('beam-unknown')).toBe(false)
  })
})
