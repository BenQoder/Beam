import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('dev refresh', () => {
  beforeEach(() => {
    ;(globalThis as any).__BEAM_DISABLE_DEV_REFRESH__ = true
    document.body.innerHTML = ''
  })

  afterEach(() => {
    delete (globalThis as any).__BEAM_DISABLE_DEV_REFRESH__
    delete (window as any).beam
    delete (window as any).beamReactivity
    document.body.innerHTML = ''
  })

  it('morphs text without replacing the root element', async () => {
    const { __beamDevRefreshInternals } = await import('../src/dev-refresh')
    const target = document.createElement('main')
    target.id = 'app'
    target.innerHTML = '<h1>Hello</h1><p>Original</p>'

    const source = document.createElement('main')
    source.id = 'app'
    source.innerHTML = '<h1>Hello world</h1><p>Original</p>'

    __beamDevRefreshInternals.morphElement(target, source)

    expect(target.id).toBe('app')
    expect(target.querySelector('h1')?.textContent).toBe('Hello world')
    expect(target.querySelector('p')?.textContent).toBe('Original')
  })

  it('preserves beam-keep nodes during morphs', async () => {
    const { __beamDevRefreshInternals } = await import('../src/dev-refresh')
    const kept = document.createElement('input')
    kept.id = 'name'
    kept.setAttribute('beam-keep', '')
    kept.value = 'typed value'

    const target = document.createElement('main')
    target.appendChild(kept)

    const source = document.createElement('main')
    source.innerHTML = '<input id="name" beam-keep value="server value"><p>New text</p>'

    __beamDevRefreshInternals.morphElement(target, source)

    expect(target.querySelector('input')).toBe(kept)
    expect((target.querySelector('input') as HTMLInputElement).value).toBe('typed value')
    expect(target.querySelector('p')?.textContent).toBe('New text')
  })

  it('notifies Beam after a dev morph', async () => {
    const { __beamDevRefreshInternals } = await import('../src/dev-refresh')
    const calls: ParentNode[] = []
    const events: Element[] = []
    const root = document.createElement('main')

    ;(window as any).beam = { scan: (node: ParentNode) => calls.push(node) }
    window.addEventListener('beam:dev-refresh', ((event: CustomEvent<{ root: Element }>) => {
      events.push(event.detail.root)
    }) as EventListener, { once: true })

    __beamDevRefreshInternals.notifyAfterMorph(root)

    expect(calls).toEqual([root])
    expect(events).toEqual([root])
  })
})
