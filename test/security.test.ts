import { describe, expect, it } from 'vitest'
import { beamCsp, beamIslandImportMap } from '../src/island'

describe('beamCsp', () => {
  it('produces a policy locking down objects/base and allowing self by default', () => {
    const csp = beamCsp()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("frame-ancestors 'self'")
  })

  it("includes 'unsafe-eval' for reactivity by default, and drops it when disabled", () => {
    expect(beamCsp()).toContain("'unsafe-eval'")
    const noEval = beamCsp({ allowReactivityEval: false })
    expect(noEval).not.toContain("'unsafe-eval'")
  })

  it('adds island source origins to script-src and extra connect-src hosts', () => {
    const csp = beamCsp({
      islandSources: ['https://cdn.example.com'],
      connectSrc: ['wss://realtime.example.com'],
    })
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))!
    expect(scriptSrc).toContain('https://cdn.example.com')
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src'))!
    expect(connectSrc).toContain('wss://realtime.example.com')
  })

  it('the import map hosts fit within a matching CSP script-src', () => {
    // sanity: default import map points at /static/beam-shared/ (self-hosted),
    // so a self+islandSources CSP covers it without extra hosts.
    const map = beamIslandImportMap()
    expect(map).toContain('/static/beam-shared/react.js')
    expect(beamCsp()).toContain("script-src 'self'")
  })
})
