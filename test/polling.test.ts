import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('capnweb', () => ({ newWebSocketRpcSession: vi.fn() }))
let internals: typeof import('../src/client')['__beamClientInternals']
beforeAll(async () => {
  ;(globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__ = true
  ;(globalThis as any).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
  ;(window as any).scrollTo = vi.fn()
  internals = (await import('../src/client')).__beamClientInternals
})
const stream = (...chunks: any[]) => new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)); controller.close() } })
function poller() {
  document.body.innerHTML = '<div id="status">Old</div><div id="poll" beam-poll beam-poll-delay beam-poll-observed beam-interval="100" beam-action="status" beam-target="#status"></div>'
  return document.querySelector<HTMLElement>('#poll')!
}
beforeEach(() => { vi.useFakeTimers(); document.head.innerHTML = '<meta name="beam-token" content="test-token">' })
afterEach(() => {
  document.querySelectorAll<HTMLElement>('[beam-poll]').forEach(internals.stopPolling)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})
describe('declarative polling', () => {
  it('dispatches events and updates named state through the full response path', async () => {
    const el = poller()
    const event = vi.fn()
    window.addEventListener('beam:server-event', event)
    vi.spyOn(internals.api, 'call').mockResolvedValue(stream({ event: { name: 'progress', data: { done: true } } }, { html: '<div id="status">Updated</div>' }) as any)
    internals.startPolling(el)
    await vi.advanceTimersByTimeAsync(100)
    expect(event).toHaveBeenCalledOnce()
    expect((event.mock.calls[0][0] as CustomEvent).detail).toEqual({ event: 'progress', data: { done: true } })
    expect(document.querySelector('#status')?.textContent).toBe('Updated')
    window.removeEventListener('beam:server-event', event)
  })
  it('waits for a stream to finish before scheduling another request', async () => {
    const el = poller()
    let controller!: ReadableStreamDefaultController<any>
    const call = vi.spyOn(internals.api, 'call').mockResolvedValue(new ReadableStream({ start(value) { controller = value } }) as any)
    internals.startPolling(el)
    await vi.advanceTimersByTimeAsync(500)
    expect(call).toHaveBeenCalledOnce()
    controller.close()
    await vi.advanceTimersByTimeAsync(100)
    expect(call).toHaveBeenCalledTimes(2)
  })
  it('stops on attribute removal and restarts when polling is enabled again', async () => {
    const el = poller()
    const call = vi.spyOn(internals.api, 'call').mockImplementation(async () => stream() as any)
    internals.startPolling(el)
    await vi.advanceTimersByTimeAsync(100)
    el.removeAttribute('beam-poll')
    await vi.advanceTimersByTimeAsync(500)
    expect(call).toHaveBeenCalledOnce()
    el.setAttribute('beam-poll', '')
    await vi.advanceTimersByTimeAsync(100)
    expect(call).toHaveBeenCalledTimes(2)
  })
  it('ignores a late response after the polling element is removed', async () => {
    const el = poller()
    let resolve!: (value: any) => void
    vi.spyOn(internals.api, 'call').mockImplementation(() => new Promise(done => { resolve = done }) as any)
    internals.startPolling(el)
    await vi.advanceTimersByTimeAsync(100)
    el.remove()
    resolve(stream({ html: '<div id="status">Stale</div>' }))
    await vi.advanceTimersByTimeAsync(100)
    expect(document.querySelector('#status')?.textContent).toBe('Old')
  })
  it('reports errors and can recover on the next scheduled poll', async () => {
    const el = poller()
    const error = vi.fn()
    window.addEventListener('beam:action-error', error)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(internals.api, 'call').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(stream({ html: '<div id="status">Recovered</div>' }) as any)
    internals.startPolling(el)
    await vi.advanceTimersByTimeAsync(200)
    expect(error).toHaveBeenCalledOnce()
    expect(document.querySelector('#status')?.textContent).toBe('Recovered')
    window.removeEventListener('beam:action-error', error)
  })
  it('does not restart an explicitly stopped poll after an unrelated DOM change', async () => {
    const el = poller()
    const call = vi.spyOn(internals.api, 'call').mockImplementation(async () => stream() as any)
    internals.startPolling(el)
    internals.stopPolling(el)
    document.body.append(document.createElement('span'))
    await vi.advanceTimersByTimeAsync(500)
    expect(call).not.toHaveBeenCalled()
  })
})
