import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'

import { registerIslands, allowIslandSources, __beamIslandsInternals } from '../src/islands'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function until(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    await flush()
  }
}

type IOEntry = { target: Element; isIntersecting: boolean }

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  observed = new Set<Element>()
  constructor(private callback: (entries: IOEntry[]) => void) {
    FakeIntersectionObserver.instances.push(this)
  }
  observe(el: Element): void {
    this.observed.add(el)
  }
  unobserve(el: Element): void {
    this.observed.delete(el)
  }
  disconnect(): void {
    this.observed.clear()
  }
  intersect(el: Element): void {
    this.callback([{ target: el, isIntersecting: true }])
  }
}

const idleCallbacks: Array<() => void> = []

beforeAll(() => {
  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver
  ;(window as any).requestIdleCallback = (cb: () => void) => {
    idleCallbacks.push(cb)
    return idleCallbacks.length
  }
})

const islandErrors: Array<{ name: string; src: string | null; phase: string; error: unknown }> = []
const onIslandError = (e: Event) => islandErrors.push((e as CustomEvent).detail)

beforeEach(() => {
  document.body.innerHTML = ''
  idleCallbacks.length = 0
  islandErrors.length = 0
  __beamIslandsInternals.resetDynamicSources()
  window.addEventListener('beam:island-error', onIslandError)
})

afterEach(async () => {
  window.removeEventListener('beam:island-error', onIslandError)
  document.body.innerHTML = ''
  await flush()
  vi.restoreAllMocks()
})

describe('mount strategies (beam-island-load)', () => {
  it('visible: defers mounting until the element intersects', async () => {
    function VisibleThing() {
      return createElement('span', { className: 'visible-thing' }, 'mounted')
    }
    registerIslands({ VisibleThing })

    document.body.innerHTML = `
      <div id="v" beam-island="VisibleThing" beam-island-load="visible">
        <span class="ph">below the fold</span>
      </div>
    `
    await flush()
    await flush()

    // not mounted, placeholder intact, but being watched
    expect(document.querySelector('.visible-thing')).toBeNull()
    expect(document.querySelector('.ph')).not.toBeNull()
    const io = FakeIntersectionObserver.instances.at(-1)!
    const el = document.querySelector('#v')!
    expect(io.observed.has(el)).toBe(true)

    io.intersect(el)
    await until(() => document.querySelector('.visible-thing') !== null)
    expect(io.observed.has(el)).toBe(false)
  })

  it('idle: defers mounting until requestIdleCallback fires', async () => {
    function IdleThing() {
      return createElement('span', { className: 'idle-thing' }, 'mounted')
    }
    registerIslands({ IdleThing })

    document.body.innerHTML = `<div beam-island="IdleThing" beam-island-load="idle"></div>`
    await flush()
    await flush()

    expect(document.querySelector('.idle-thing')).toBeNull()
    expect(idleCallbacks.length).toBeGreaterThan(0)

    idleCallbacks.splice(0).forEach((cb) => cb())
    await until(() => document.querySelector('.idle-thing') !== null)
  })

  it('visible islands adopt props set while still pending', async () => {
    function LateProps({ label }: { label?: string }) {
      return createElement('span', { className: 'late-props' }, label ?? '')
    }
    registerIslands({ LateProps })

    document.body.innerHTML = `
      <div id="lp" beam-island="LateProps" beam-island-load="visible" beam-props='{"label":"early"}'></div>
    `
    await flush()

    // server pushes new props before the island ever mounted
    document.querySelector('#lp')!.setAttribute('beam-props', '{"label":"latest"}')
    await flush()

    const io = FakeIntersectionObserver.instances.at(-1)!
    io.intersect(document.querySelector('#lp')!)
    await until(() => document.querySelector('.late-props')?.textContent === 'latest')
  })
})

describe('crash resilience', () => {
  it('restores the placeholder and emits beam:island-error when render throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Boom() {
      throw new Error('tenant bug')
    }
    registerIslands({ Boom })

    document.body.innerHTML = `
      <div id="crash" beam-island="Boom">
        <span class="ph">static server card</span>
      </div>
    `

    await until(() => islandErrors.length > 0)
    await flush()

    expect(islandErrors[0].name).toBe('Boom')
    expect(islandErrors[0].phase).toBe('render')
    expect(document.querySelector('#crash')?.innerHTML).toContain('static server card')

    // no remount loop: further DOM mutations must not retry the crashed island
    document.body.appendChild(document.createElement('i'))
    await flush()
    await flush()
    expect(islandErrors.length).toBe(1)
    expect(document.querySelector('#crash')?.innerHTML).toContain('static server card')
  })

  it('restores the placeholder when a props update makes the component throw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Flaky({ bad }: { bad?: boolean }) {
      if (bad) throw new Error('bad props')
      return createElement('span', { className: 'flaky' }, 'fine')
    }
    registerIslands({ Flaky })

    document.body.innerHTML = `
      <div id="flaky" beam-island="Flaky" beam-props='{"bad":false}'>
        <span class="ph">server fallback</span>
      </div>
    `
    await until(() => document.querySelector('.flaky') !== null)

    document.querySelector('#flaky')!.setAttribute('beam-props', '{"bad":true}')
    await until(() => islandErrors.length > 0)
    await flush()

    expect(islandErrors[0].phase).toBe('render')
    expect(document.querySelector('#flaky')?.innerHTML).toContain('server fallback')
  })

  it('keeps the placeholder and emits beam:island-error when a module fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    __beamIslandsInternals.setRemoteImporter(() => Promise.reject(new Error('404 artifact')))
    allowIslandSources(['/islands/'])

    document.body.innerHTML = `
      <div id="deadsrc" beam-island="Dead" beam-island-src="/islands/dead.js">
        <span class="ph">still the server card</span>
      </div>
    `

    await until(() => islandErrors.length > 0)
    expect(islandErrors[0].phase).toBe('load')
    expect(islandErrors[0].src).toContain('/islands/dead.js')
    expect(document.querySelector('#deadsrc')?.innerHTML).toContain('still the server card')
  })
})
