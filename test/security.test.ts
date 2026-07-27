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

  it('denies inline scripts by default and supports a request nonce', () => {
    const defaultScriptSrc = beamCsp().split(';').find((d) => d.trim().startsWith('script-src'))!
    expect(defaultScriptSrc).not.toContain("'unsafe-inline'")

    const csp = beamCsp({ scriptNonce: 'request-nonce' })
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))!
    expect(scriptSrc).toContain("'nonce-request-nonce'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('requires an explicit escape hatch for unsafe inline scripts', () => {
    const csp = beamCsp({ allowUnsafeInlineScripts: true })
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))!
    expect(scriptSrc).toContain("'unsafe-inline'")
  })

  it('rejects malformed nonce values instead of interpolating CSP directives', () => {
    expect(() => beamCsp({ scriptNonce: "safe'; script-src *" })).toThrow(
      'Beam CSP scriptNonce must be a base64 or base64url value'
    )
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

  it('escapes import-map script terminators and nonce attributes', () => {
    const map = beamIslandImportMap({
      nonce: 'safe" nonce',
      extra: {
        '@tenant/component': '</script><script>globalThis.pwned=true</script>',
      },
    })

    expect(map).not.toContain('</script><script>')
    expect(map).toContain('\\u003c/script>')
    expect(map).toContain('nonce="safe&quot; nonce"')
  })
})
