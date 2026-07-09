import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('capnweb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('capnweb')>()
  return {
    ...actual,
    newWebSocketRpcSession: vi.fn(() => ({
      authenticate: vi.fn(async () => ({
        registerCallback: vi.fn(async () => {}),
        visit: vi.fn(),
        call: vi.fn(),
      })),
    })),
  }
})

import { __beamCreateBeamInternals } from '../src/createBeam'
import type { ActionResponse } from '../src/types'

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let clientInternals: typeof import('../src/client')['__beamClientInternals']

beforeAll(async () => {
  ;(globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__ = true
  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver
  ;(window as any).scrollTo = vi.fn()
  ;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  }
  clientInternals = (await import('../src/client')).__beamClientInternals
})

function makeCtx() {
  return __beamCreateBeamInternals.createBeamContext({
    env: {},
    user: null,
    request: new Request('http://localhost/'),
    session: { get: async () => null, set: async () => {}, delete: async () => {} },
  })
}

async function readAll(stream: ReadableStream<ActionResponse>): Promise<ActionResponse[]> {
  const reader = stream.getReader()
  const chunks: ActionResponse[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return chunks
}

afterEach(() => {
  delete (globalThis as any).__BEAM_DEV__
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('server error propagation', () => {
  const boom = () => {
    throw new Error('db exploded')
  }

  it('production: the stream fails opaquely', async () => {
    const stream = __beamCreateBeamInternals.createDirectActionStream(
      boom,
      makeCtx(),
      {},
      'saveOrder'
    )
    await expect(readAll(stream)).rejects.toThrow('db exploded')
  })

  it('dev: delivers an error chunk with action, message, and stack', async () => {
    ;(globalThis as any).__BEAM_DEV__ = true
    const stream = __beamCreateBeamInternals.createDirectActionStream(
      boom,
      makeCtx(),
      {},
      'saveOrder'
    )
    const chunks = await readAll(stream)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].error?.action).toBe('saveOrder')
    expect(chunks[0].error?.message).toBe('db exploded')
    expect(chunks[0].error?.stack).toContain('db exploded')
  })

  it('HTTP pipeline (prepareActionStream): dev delivers error chunks, production rethrows', async () => {
    // production: the throw escapes to the route (opaque 500)
    await expect(
      __beamCreateBeamInternals.prepareActionStream(boom, makeCtx(), {}, 'saveOrder')
    ).rejects.toThrow('db exploded')

    // dev: single error chunk with full details
    ;(globalThis as any).__BEAM_DEV__ = true
    const stream = await __beamCreateBeamInternals.prepareActionStream(boom, makeCtx(), {}, 'saveOrder')
    const chunks = await readAll(stream)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].error?.action).toBe('saveOrder')
    expect(chunks[0].error?.stack).toContain('db exploded')
  })

  it('HTTP pipeline: generator crashing mid-stream delivers prior chunks then the error', async () => {
    ;(globalThis as any).__BEAM_DEV__ = true
    async function* flaky() {
      yield { html: '<p>first</p>' }
      throw new Error('mid-stream crash')
    }
    const stream = await __beamCreateBeamInternals.prepareActionStream(flaky, makeCtx(), {}, 'flaky')
    const chunks = await readAll(stream)
    expect(chunks).toHaveLength(2)
    expect(chunks[0].html).toBe('<p>first</p>')
    expect(chunks[1].error?.message).toBe('mid-stream crash')
  })

  it('dev: streaming actions that throw mid-stream still deliver prior chunks', async () => {
    ;(globalThis as any).__BEAM_DEV__ = true
    async function* flaky() {
      yield { html: '<p>first</p>' }
      throw new Error('mid-stream crash')
    }
    const stream = __beamCreateBeamInternals.createDirectActionStream(
      flaky,
      makeCtx(),
      {},
      'flaky'
    )
    const chunks = await readAll(stream)
    expect(chunks).toHaveLength(2)
    expect(chunks[0].html).toBe('<p>first</p>')
    expect(chunks[1].error?.message).toBe('mid-stream crash')
  })
})

describe('client error handling', () => {
  it('applyResponse dispatches beam:action-error for error chunks', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const received: unknown[] = []
    const listener = (e: Event) => received.push((e as CustomEvent).detail)
    window.addEventListener('beam:action-error', listener)

    clientInternals.applyResponse(
      { error: { action: 'saveOrder', message: 'db exploded', stack: 'stack...' } },
      null,
      'replace'
    )

    window.removeEventListener('beam:action-error', listener)
    expect(received).toEqual([{ action: 'saveOrder', message: 'db exploded', stack: 'stack...' }])
  })

  it('traceAction logs call, chunks, and duration when debug is on', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    clientInternals.setDebug(true)

    const trace = clientInternals.traceAction('addToCart', { id: 1 })
    trace.chunk({ state: { cart: {} }, json: { ok: true } })
    trace.done()

    const lines = log.mock.calls.map((c) => String(c[0]))
    expect(lines.some((l) => l.includes('→ addToCart'))).toBe(true)
    expect(lines.some((l) => l.includes('state(cart) + json'))).toBe(true)
    expect(lines.some((l) => l.match(/✓ addToCart done in \d+ms/))).toBe(true)

    clientInternals.setDebug(false)
    log.mockClear()
    const silent = clientInternals.traceAction('addToCart', {})
    silent.chunk({})
    silent.done()
    expect(log).not.toHaveBeenCalled()
  })
})

describe('dev overlay', () => {
  it('renders action errors and dismisses on Escape', async () => {
    await import('../src/dev-overlay')

    window.dispatchEvent(
      new CustomEvent('beam:action-error', {
        detail: { action: 'saveOrder', message: 'db exploded', stack: 'Error: db exploded\n  at handler' },
      })
    )

    const overlay = document.getElementById('beam-dev-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('action "saveOrder"')
    expect(overlay!.textContent).toContain('db exploded')
    expect(overlay!.textContent).toContain('at handler')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.getElementById('beam-dev-overlay')).toBeNull()
  })

  it('renders island crashes too', async () => {
    await import('../src/dev-overlay')

    window.dispatchEvent(
      new CustomEvent('beam:island-error', {
        detail: { name: 'ProductCard', src: '/islands/pc.js', phase: 'render', error: new Error('island bug') },
      })
    )

    const overlay = document.getElementById('beam-dev-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('island "ProductCard" crashed')
    expect(overlay!.textContent).toContain('island bug')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  })
})
