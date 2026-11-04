import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockVisit = vi.fn()
const mockCall = vi.fn()
const mockAuthenticate = vi.fn(async () => ({
  registerCallback: vi.fn(async () => {}),
  visit: mockVisit,
  call: mockCall,
}))

vi.mock('capnweb', () => ({
  newWebSocketRpcSession: vi.fn(() => ({ authenticate: mockAuthenticate })),
}))

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function loadClient() {
  vi.resetModules()
  ;(globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__ = true
  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver
  ;(window as any).scrollTo = vi.fn()
  ;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  }
  const mod = await import('../src/client')
  vi.spyOn(mod.__beamClientInternals.api, 'visit').mockImplementation((...args: any[]) => mockVisit(...args))
  return mod.__beamClientInternals
}

function failingStream(error: unknown): ReadableStream<any> {
  return new ReadableStream({
    start(controller) {
      controller.error(error)
    },
  })
}

function visitResponse(url: string, body: string) {
  return {
    url,
    finalUrl: url,
    status: 200,
    mode: 'visit',
    target: 'body',
    title: 'Page',
    documentHtml: `<html><head><title>Page</title></head><body>${body}</body></html>`,
    assetSignature: '',
    scroll: 'reset',
  }
}

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true })
}

describe('page-leaving error suppression', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    mockCall.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    window.dispatchEvent(new Event('pageshow'))
    document.body.innerHTML = ''
    await flush()
    delete (globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__
    vi.restoreAllMocks()
  })

  it('shows the toast for a real stream failure', async () => {
    await loadClient()
    mockCall.mockResolvedValue(failingStream(new Error('boom')))
    document.body.innerHTML = '<button id="b" beam-action="submit">Go</button>'

    document.querySelector<HTMLElement>('#b')!.click()
    await flush()

    expect(document.querySelector('.toast-error, [class*="toast"]')).not.toBeNull()
  })

  it('skips the toast and flags the error as leaving after pagehide', async () => {
    await loadClient()
    const detail = vi.fn()
    window.addEventListener('beam:action-error', (e) => detail((e as CustomEvent).detail))
    mockCall.mockResolvedValue(failingStream(new Error('WritableStream RPC stub was disposed')))
    document.body.innerHTML = '<button id="b" beam-action="submit">Go</button>'

    window.dispatchEvent(new Event('pagehide'))
    document.querySelector<HTMLElement>('#b')!.click()
    await flush()

    expect(document.querySelector('[class*="toast"]')).toBeNull()
    expect(detail).toHaveBeenCalledWith(expect.objectContaining({ action: 'submit', leaving: true }))
  })

  it('treats beforeunload as leaving unless the unload is cancelled', async () => {
    await loadClient()
    mockCall.mockResolvedValue(failingStream(new Error('boom')))
    document.body.innerHTML = '<button id="b" beam-action="submit">Go</button>'

    window.dispatchEvent(new Event('beforeunload', { cancelable: true }))
    document.querySelector<HTMLElement>('#b')!.click()
    await flush()
    expect(document.querySelector('[class*="toast"]')).toBeNull()

    // A dirty-form prompt the user declines: navigation cancelled, errors matter again
    window.dispatchEvent(new Event('pageshow'))
    const cancel = (ev: Event) => ev.preventDefault()
    window.addEventListener('beforeunload', cancel)
    window.dispatchEvent(new Event('beforeunload', { cancelable: true }))
    window.removeEventListener('beforeunload', cancel)
    await new Promise((r) => setTimeout(r, 5))
    mockCall.mockResolvedValue(failingStream(new Error('boom')))
    document.querySelector<HTMLElement>('#b')!.click()
    await flush()
    expect(document.querySelector('[class*="toast"]')).not.toBeNull()
  })

  it('shows toasts again after a bfcache restore', async () => {
    await loadClient()
    mockCall.mockResolvedValue(failingStream(new Error('boom')))
    document.body.innerHTML = '<button id="b" beam-action="submit">Go</button>'

    window.dispatchEvent(new Event('pagehide'))
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }))
    document.querySelector<HTMLElement>('#b')!.click()
    await flush()

    expect(document.querySelector('[class*="toast"]')).not.toBeNull()
  })
})

describe('back navigation through visits', () => {
  beforeEach(() => {
    // Listeners from earlier module instances stay attached and log visit fallbacks
    vi.spyOn(console, 'error').mockImplementation(() => {})
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    sessionStorage.clear()
    mockVisit.mockReset()
    history.replaceState(null, '', '/list')
    setScrollY(0)
  })

  afterEach(async () => {
    document.body.innerHTML = ''
    await flush()
    delete (globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__
    vi.restoreAllMocks()
  })

  it('marks the landing entry as a Beam entry', async () => {
    await loadClient()
    expect(history.state).toMatchObject({ beamVisit: true, target: 'body' })
  })

  it('restores loaded list items and scroll position on a Back visit', async () => {
    const internals = await loadClient()
    document.body.innerHTML = `
      <div id="list"><div beam-item-id="1">Item 1</div></div>
      <button beam-load-more beam-action="loadMore" beam-target="#list"></button>
    `
    // Simulate pages loaded via load-more, then leaving for the detail page
    document.querySelector('#list')!.innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<div beam-item-id="${i + 1}">Item ${i + 1}</div>`).join('')
    setScrollY(480)
    internals.saveScrollState('#list', 'loadMore')

    mockVisit.mockResolvedValueOnce(visitResponse('http://localhost:3000/item/1', '<h1>Detail</h1>'))
    await internals.performVisit('http://localhost:3000/item/1', { mode: 'visit', target: 'body', replace: false })
    expect(document.body.textContent).toContain('Detail')

    // Back: server renders the first page of the list again
    history.replaceState({ beamVisit: true, url: '/list', mode: 'visit', target: 'body', scrollY: 480 }, '', '/list')
    mockVisit.mockResolvedValueOnce(visitResponse('http://localhost:3000/list', `
      <div id="list"><div beam-item-id="1">Item 1</div></div>
      <button beam-load-more beam-action="loadMore" beam-target="#list"></button>
    `))
    await internals.performVisit('http://localhost:3000/list', {
      mode: 'visit', target: 'body', replace: true, restore: true,
    })

    expect(document.querySelectorAll('#list [beam-item-id]').length).toBe(5)
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 480)
  })

  it('restores the stored scroll position of a plain page on Back', async () => {
    const internals = await loadClient()
    history.replaceState({ beamVisit: true, url: '/plain', mode: 'visit', target: 'body', scrollY: 320 }, '', '/plain')
    mockVisit.mockResolvedValueOnce(visitResponse('http://localhost:3000/plain', '<h1>Plain</h1>'))

    await internals.performVisit('http://localhost:3000/plain', {
      mode: 'visit', target: 'body', replace: true, restore: true,
    })

    expect(document.body.textContent).toContain('Plain')
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 320)
    expect(history.state.scrollY).toBe(320)
  })

  it('does not restore saved list state on a fresh forward visit', async () => {
    const internals = await loadClient()
    document.body.innerHTML = `
      <div id="list"><div beam-item-id="1">Item 1</div><div beam-item-id="2">Item 2</div></div>
      <button beam-load-more beam-action="loadMore" beam-target="#list"></button>
    `
    internals.saveScrollState('#list', 'loadMore')
    history.replaceState({ beamVisit: true, url: '/home', mode: 'visit', target: 'body' }, '', '/home')
    mockVisit.mockResolvedValueOnce(visitResponse('http://localhost:3000/list', `
      <div id="list"><div beam-item-id="1">Item 1</div></div>
      <button beam-load-more beam-action="loadMore" beam-target="#list"></button>
    `))
    history.replaceState(null, '', '/list')

    await internals.performVisit('http://localhost:3000/list', { mode: 'visit', target: 'body', replace: false })

    expect(document.querySelectorAll('#list [beam-item-id]').length).toBe(1)
  })

  it('handles popstate to the landing entry as a visit', async () => {
    await loadClient()
    mockVisit.mockResolvedValueOnce(visitResponse('http://localhost:3000/list', '<h1>First</h1>'))

    history.pushState({ beamVisit: true, url: '/other', mode: 'visit', target: 'body' }, '', '/other')
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
    history.replaceState({ beamVisit: true, url: '/list', mode: 'visit', target: 'body' }, '', '/list')
    mockVisit.mockClear()
    mockVisit.mockResolvedValueOnce(visitResponse('http://localhost:3000/list', '<h1>First</h1>'))
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
    await flush()

    expect(mockVisit).toHaveBeenCalled()
    expect(document.body.textContent).toContain('First')
  })
})
