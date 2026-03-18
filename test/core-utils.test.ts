import { describe, expect, it } from 'vitest'

import { collectActions } from '../src/collect'
import { render } from '../src/render'
import { beamPlugin } from '../src/vite'

describe('core utilities', () => {
  it('collectActions returns named function exports only', () => {
    const actions = collectActions({
      '/a.ts': {
        save: () => 'ok',
        notAFunction: 123,
        default: () => 'skip',
      },
      '/b.ts': {
        remove: () => 'gone',
      },
    })

    expect(Object.keys(actions).sort()).toEqual(['remove', 'save'])
  })

  it('render resolves sync and async stringables', async () => {
    const sync = await render({ toString: () => 'sync-html' } as any)
    const asyncValue = await render(Promise.resolve({ toString: () => Promise.resolve('async-html') } as any))

    expect(sync).toBe('sync-html')
    expect(asyncValue).toBe('async-html')
  })

  it('beamPlugin resolves and loads the virtual module', () => {
    const plugin = beamPlugin({
      actions: '/app/actions/*.tsx',
      auth: '/app/auth.ts',
      session: { secretEnvKey: 'APP_SECRET', cookieName: 'sid', maxAge: 60, storage: '/app/session.ts' },
    })

    expect(plugin.resolveId?.('virtual:beam')).toBe('\0virtual:beam')

    const code = plugin.load?.('\0virtual:beam')
    expect(typeof code).toBe('string')
    expect(code).toContain("import auth from '/app/auth.ts'")
    expect(code).toContain("import storageFactory from '/app/session.ts'")
    expect(code).toContain("collectActions(import.meta.glob('/app/actions/*.tsx', { eager: true }))")
    expect(code).toContain("secretEnvKey: 'APP_SECRET'")
    expect(code).toContain("cookieName: 'sid'")
  })
})
