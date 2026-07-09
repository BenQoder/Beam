import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('capnweb', () => ({
  newWebSocketRpcSession: vi.fn(() => ({
    authenticate: vi.fn(async () => ({
      registerCallback: vi.fn(async () => {}),
      visit: vi.fn(),
      call: vi.fn(),
    })),
  })),
}))

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let internals: typeof import('../src/client')['__beamClientInternals']

beforeAll(async () => {
  ;(globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__ = true
  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver
  ;(window as any).scrollTo = vi.fn()
  ;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  }
  internals = (await import('../src/client')).__beamClientInternals
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  document.body.innerHTML = ''
  delete (window as any).matchMedia
})

describe('view transitions (layer 1)', () => {
  it('wraps swaps in document.startViewTransition when opted in', () => {
    const startViewTransition = vi.fn((cb: () => void) => cb())
    ;(document as any).startViewTransition = startViewTransition

    document.body.innerHTML = `<div id="vt" beam-transition="view"><p>old</p></div>`
    internals.swap(document.querySelector('#vt')!, '<p>new</p>', 'replace')

    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(document.querySelector('#vt')?.textContent).toBe('new')

    // without the attribute: no view transition
    startViewTransition.mockClear()
    document.body.innerHTML = `<div id="plain"><p>old</p></div>`
    internals.swap(document.querySelector('#plain')!, '<p>new</p>', 'replace')
    expect(startViewTransition).not.toHaveBeenCalled()

    delete (document as any).startViewTransition
  })

  it('skips view transitions under prefers-reduced-motion (swap still applies)', () => {
    const startViewTransition = vi.fn((cb: () => void) => cb())
    ;(document as any).startViewTransition = startViewTransition
    ;(window as any).matchMedia = () => ({ matches: true })

    document.body.innerHTML = `<div id="vt" beam-transition="view"><p>old</p></div>`
    internals.swap(document.querySelector('#vt')!, '<p>new</p>', 'replace')

    expect(startViewTransition).not.toHaveBeenCalled()
    expect(document.querySelector('#vt')?.textContent).toBe('new')
    delete (document as any).startViewTransition
  })

  it('applies beam-transition-name as view-transition-name style', () => {
    document.body.innerHTML = `<div id="z"></div>`
    internals.swap(
      document.querySelector('#z')!,
      '<img beam-transition-name="product-42" />',
      'replace'
    )
    const img = document.querySelector<HTMLElement>('[beam-transition-name]')!
    expect(img.style.getPropertyValue('view-transition-name')).toBe('product-42')
  })
})

describe('enter transitions (layer 2)', () => {
  it('runs the enter class lifecycle on inserted content', async () => {
    document.body.innerHTML = `<div id="zone"></div>`
    internals.swap(
      document.querySelector('#zone')!,
      '<div id="card" beam-enter="anim" beam-enter-start="from" beam-enter-end="to">hi</div>',
      'replace'
    )

    const card = document.querySelector('#card')!
    // rAF is immediate in tests: start already swapped for end
    expect(card.classList.contains('anim')).toBe(true)
    expect(card.classList.contains('from')).toBe(false)
    expect(card.classList.contains('to')).toBe(true)

    card.dispatchEvent(new Event('transitionend'))
    expect(card.classList.contains('anim')).toBe(false)
    expect(card.classList.contains('to')).toBe(false)
  })

  it('staggers children via beam-enter-stagger', () => {
    document.body.innerHTML = `<div id="list" beam-enter-stagger="80"></div>`
    internals.swap(
      document.querySelector('#list')!,
      `<span beam-enter="a">1</span><span beam-enter="a">2</span><span beam-enter="a">3</span>`,
      'replace'
    )
    const delays = Array.from(document.querySelectorAll<HTMLElement>('#list span')).map(
      (el) => el.style.transitionDelay
    )
    expect(delays).toEqual(['0ms', '80ms', '160ms'])
  })

  it('appended nodes get enter transitions too', () => {
    document.body.innerHTML = `<ul id="items"><li>old</li></ul>`
    internals.swap(
      document.querySelector('#items')!,
      '<li beam-enter="pop-in" beam-enter-start="hidden">new</li>',
      'append'
    )
    const li = document.querySelectorAll('#items li')[1]
    expect(li.textContent).toBe('new')
    expect(li.classList.contains('pop-in')).toBe(true)
    expect(li.classList.contains('hidden')).toBe(false)
  })

  it('skips animation classes under reduced motion', () => {
    ;(window as any).matchMedia = () => ({ matches: true })
    document.body.innerHTML = `<div id="rm"></div>`
    internals.swap(
      document.querySelector('#rm')!,
      '<div id="calm" beam-enter="anim" beam-enter-start="from">hi</div>',
      'replace'
    )
    const el = document.querySelector('#calm')!
    expect(el.classList.contains('anim')).toBe(false)
    expect(el.classList.contains('from')).toBe(false)
  })
})

describe('leave transitions', () => {
  it('animates out before beam-swap delete removes the element', async () => {
    document.body.innerHTML = `
      <div id="doomed" beam-leave="fading" beam-leave-start="visible" beam-leave-end="gone">bye</div>
    `
    const el = document.querySelector('#doomed')!
    internals.swap(el, '', 'delete')

    // still in the DOM, animating
    expect(el.isConnected).toBe(true)
    expect(el.classList.contains('fading')).toBe(true)
    expect(el.classList.contains('gone')).toBe(true)

    el.dispatchEvent(new Event('transitionend'))
    await flush()
    expect(document.querySelector('#doomed')).toBeNull()
  })

  it('removes immediately when no leave classes are present', async () => {
    document.body.innerHTML = `<div id="plain-del">bye</div>`
    internals.swap(document.querySelector('#plain-del')!, '', 'delete')
    await flush()
    expect(document.querySelector('#plain-del')).toBeNull()
  })
})

describe('append/prepend trigger semantics', () => {
  it('keeps a plain append button (only load-more/infinite sentinels self-remove)', () => {
    document.body.innerHTML = `
      <ul id="list"></ul>
      <button id="adder" beam-action="addRow">Add</button>
    `
    const btn = document.querySelector<HTMLElement>('#adder')!
    internals.swap(document.querySelector('#list')!, '<li>row 1</li>', 'append', btn)
    internals.swap(document.querySelector('#list')!, '<li>row 2</li>', 'append', btn)

    // button survived → both rows accumulated
    expect(document.querySelector('#adder')).not.toBeNull()
    expect(document.querySelectorAll('#list li').length).toBe(2)
  })

  it('removes a beam-load-more sentinel (self-replacing pattern)', () => {
    document.body.innerHTML = `
      <ul id="list2"></ul>
      <button id="more" beam-load-more beam-action="loadMore">Load More</button>
    `
    const sentinel = document.querySelector<HTMLElement>('#more')!
    internals.swap(document.querySelector('#list2')!, '<li>page 2</li>', 'append', sentinel)
    expect(document.querySelector('#more')).toBeNull()
    expect(document.querySelectorAll('#list2 li').length).toBe(1)
  })
})

describe('animation presets', () => {
  it('beam.css defines the expanded preset set with reduced-motion guard', () => {
    const css = fs.readFileSync(path.join(__dirname, '../src/beam.css'), 'utf8')
    for (const preset of ['fade', 'scale', 'zoom', 'pop', 'blur', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'flip-x', 'flip-y']) {
      expect(css).toContain(`[beam-swap-transition="${preset}"]`)
    }
    expect(css).toContain('--beam-swap-duration')
    expect(css).toContain('prefers-reduced-motion')
  })

  it('snaps the from-state so the swap animates IN, not into a dip', () => {
    // Regression: without transition:none on .beam-swap-enter, the always-on
    // base transition animates INTO the from-state — a near-invisible dip
    // instead of a fade-in.
    const css = fs.readFileSync(path.join(__dirname, '../src/beam.css'), 'utf8')
    expect(css).toMatch(/\[beam-swap-transition\]\.beam-swap-enter\s*\{\s*transition:\s*none/)
  })
})
