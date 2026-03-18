import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('capnweb', () => ({
  newWebSocketRpcSession: vi.fn(() => ({
    authenticate: vi.fn(),
  })),
}))

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function loadClientInternals() {
  vi.resetModules()
  ;(globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__ = true
  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver
  ;(window as any).scrollTo = vi.fn()
  ;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  }
  const mod = await import('../src/client')
  return mod.__beamClientInternals
}

function streamOf(...responses: any[]): ReadableStream<any> {
  return new ReadableStream({
    start(controller) {
      responses.forEach((value) => controller.enqueue(value))
      controller.close()
    },
  })
}

describe('client internals', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    sessionStorage.clear()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('parses out-of-band swaps and applies server state/script/html responses', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <div id="target"></div>
      <div id="sidebar"></div>
      <div beam-state='{"message":"Initial"}' beam-id="panelState">
        <span id="message" beam-text="message"></span>
      </div>
    `
    await Promise.resolve()
    const parsed = internals.parseOobSwaps(
      '<div>Main</div><template beam-touch="#sidebar"><div>Side</div></template>'
    )

    expect(parsed.main).toContain('Main')
    expect(parsed.oob).toEqual([{ selector: '#sidebar', content: '<div>Side</div>', swapMode: 'replace' }])

    ;(globalThis as any).__beamScriptRan = false
    internals.applyResponse(
      {
        state: { panelState: { message: 'Updated' } },
        html: '<div>Rendered</div>',
        target: '#target',
        script: 'globalThis.__beamScriptRan = true',
      },
      null,
      'replace'
    )

    expect(document.querySelector('#target')?.innerHTML).toContain('Rendered')
    expect(document.querySelector('#message')?.textContent).toBe('Updated')
    expect((globalThis as any).__beamScriptRan).toBe(true)
  })

  it('applies streamed state chunks sequentially to named state', async () => {
    const internals = await loadClientInternals()
    const { beamReactivity } = await import('../src/reactivity')
    document.body.innerHTML = `
      <div beam-state="phase: 'idle'; progress: 0" beam-id="streamingStatus">
        <span id="phase" beam-text="phase"></span>
        <span id="progress" beam-text="progress"></span>
      </div>
      <span id="mirror" beam-state-ref="streamingStatus" beam-text="phase + ':' + progress"></span>
    `
    beamReactivity.init()
    await Promise.resolve()

    const chunks = [
      { state: { streamingStatus: { phase: 'starting', progress: 0 } } },
      { state: { streamingStatus: { phase: 'loading', progress: 40 } } },
      { state: { streamingStatus: { phase: 'done', progress: 100 } } },
    ]

    for (const chunk of chunks) {
      internals.applyResponse(chunk, null, 'replace')
    }

    expect(document.querySelector('#phase')?.textContent).toBe('done')
    expect(document.querySelector('#progress')?.textContent).toBe('100')
    expect(document.querySelector('#mirror')?.textContent).toBe('done:100')
  })

  it('preserves beam-keep nodes by stable identity and skips ambiguous name-only matches', async () => {
    const internals = await loadClientInternals()

    document.body.innerHTML = `
      <div id="target">
        <input id="kept" beam-keep name="email" value="original@example.com" />
      </div>
    `
    const kept = document.querySelector<HTMLInputElement>('#kept')!
    internals.applyHtml(
      document.querySelector('#target')!,
      '<div id="target"><input id="kept" beam-keep name="email" value="server@example.com" /></div>',
      { style: 'outerHTML' }
    )
    expect(document.querySelector<HTMLInputElement>('#kept')).toBe(kept)
    expect(document.querySelector<HTMLInputElement>('#kept')?.value).toBe('original@example.com')

    document.body.innerHTML = `
      <div id="list">
        <input beam-keep name="choice" value="first" />
        <input beam-keep name="choice" value="second" />
      </div>
    `
    internals.applyHtml(
      document.querySelector('#list')!,
      '<div id="list"><input beam-keep name="choice" value="server-first" /><input beam-keep name="choice" value="server-second" /></div>',
      { style: 'outerHTML' }
    )
    const values = Array.from(document.querySelectorAll<HTMLInputElement>('#list input')).map((el) => el.value)
    expect(values).toEqual(['server-first', 'server-second'])
  })

  it('handles target resolution and hungry element refreshes', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <div id="target">Old</div>
      <div id="hungry" beam-hungry>Old hungry</div>
      <div beam-id="cart" beam-hungry><span>Old cart</span></div>
      <div beam-item-id="row:1" beam-hungry><span>Old row</span></div>
    `

    internals.handleHtmlResponse(
      {
        html: '<div>Fresh main</div><template beam-touch="#target"><span>Side</span></template>',
        target: '#target',
      },
      '#target',
      'replace'
    )
    internals.processHungryElements(
      '<div id="hungry">Fresh hungry</div><div beam-id="cart"><span>Fresh cart</span></div><div beam-item-id="row:1"><span>Fresh row</span></div>'
    )

    expect(document.querySelector('#hungry')?.innerHTML).toContain('Fresh hungry')
    expect(document.querySelector('[beam-id="cart"]')?.innerHTML).toContain('Fresh cart')
    expect(document.querySelector('[beam-item-id="row:1"]')?.innerHTML).toContain('Fresh row')
    expect(document.querySelector('#target')?.innerHTML).toContain('Side')
  })

  it('does not auto-target html fragments by input name alone', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <div id="results">Original</div>
      <input id="original-email" name="email" value="a@example.com" />
    `

    internals.handleHtmlResponse(
      {
        html: '<input name="email" value="server@example.com" />',
      },
      '#results',
      'replace'
    )

    expect((document.querySelector('#original-email') as HTMLInputElement).value).toBe('a@example.com')
    expect(document.querySelector('#results')?.innerHTML).toContain('server@example.com')
  })

  it('setupSwitch controls show/hide and enable/disable targets', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <form>
        <select id="picker" beam-switch=".switch-target" beam-switch-observed>
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
        <div id="show-a" class="switch-target" beam-show-for="a">A content</div>
        <button id="enable-b" class="switch-target" beam-enable-for="b">B button</button>
      </form>
    `

    const picker = document.querySelector<HTMLElement>('#picker') as HTMLSelectElement
    internals.setupSwitch(picker)

    expect((document.querySelector('#show-a') as HTMLElement).style.display).toBe('')
    expect((document.querySelector('#enable-b') as HTMLButtonElement).disabled).toBe(true)

    picker.value = 'b'
    picker.dispatchEvent(new Event('input', { bubbles: true }))

    expect((document.querySelector('#show-a') as HTMLElement).style.display).toBe('none')
    expect((document.querySelector('#enable-b') as HTMLButtonElement).disabled).toBe(false)
  })

  it('setupAutosubmit dispatches form submit with debounce', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <form id="form" beam-autosubmit beam-debounce="100" beam-autosubmit-observed>
        <input id="query" />
      </form>
    `

    const form = document.querySelector<HTMLFormElement>('#form')!
    const submitSpy = vi.fn((e: Event) => e.preventDefault())
    form.addEventListener('submit', submitSpy)
    internals.setupAutosubmit(form)

    document.querySelector('#query')?.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(99)
    expect(submitSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(submitSpy).toHaveBeenCalledTimes(1)
  })

  it('casts watched values and evaluates watch conditions', async () => {
    const internals = await loadClientInternals()
    const input = document.createElement('input')
    input.setAttribute('beam-watch-if', 'value.length >= 3')

    expect(internals.castValue('42', 'number')).toBe(42)
    expect(internals.castValue(' yes ', 'trim')).toBe('yes')
    expect(internals.checkWatchCondition(input, 'ab')).toBe(false)
    expect(internals.checkWatchCondition(input, 'abcd')).toBe(true)
  })

  it('setupInputWatcher sends RPC calls and updates targets', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <input id="search" name="q" beam-action="search" beam-watch="input" beam-target="#results" beam-debounce="100" beam-input-observed />
      <div id="results"></div>
    `

    vi.spyOn(internals.api, 'call').mockImplementation(async () => streamOf({ html: '<div>Result</div>' }) as any)

    const input = document.querySelector('#search') as HTMLInputElement
    internals.setupInputWatcher(input)
    input.value = 'beam'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    expect(internals.api.call).toHaveBeenCalledWith('search', { q: 'beam' })
    expect(document.querySelector('#results')?.innerHTML).toContain('Result')
  })

  it('saves and restores scroll state for infinite/load-more views', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <div id="list"><div beam-item-id="1">Cached A</div></div>
      <button beam-load-more beam-action="loadMore" beam-target="#list"></button>
    `

    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true })

    internals.saveScrollState('#list', 'loadMore')
    document.querySelector('#list')!.innerHTML = '<div beam-item-id="1">Fresh A</div>'
    expect(internals.restoreScrollState()).toBe(true)
    await Promise.resolve()
    expect(scrollTo).toHaveBeenCalled()
  })

  it('starts and stops polling while applying streamed html', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <div id="status">Old</div>
      <div id="poller" beam-poll beam-action="status" beam-target="#status" beam-interval="1000" beam-poll-observed></div>
    `

    vi.spyOn(internals.api, 'call').mockImplementation(async () => streamOf({ html: '<div>Polled</div>' }) as any)

    const el = document.querySelector('#poller') as HTMLElement
    internals.startPolling(el)
    await Promise.resolve()
    vi.advanceTimersByTime(1000)
    await Promise.resolve()
    await Promise.resolve()

    expect(document.querySelector('#status')?.innerHTML).toContain('Polled')
    internals.stopPolling(el)
  })

  it('tracks dirty forms and toggles indicators', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <form id="profile" beam-dirty-track beam-dirty-observed>
        <input name="name" value="Ben" />
      </form>
      <span id="indicator" beam-dirty-indicator="#profile"></span>
    `

    const form = document.querySelector<HTMLFormElement>('#profile')!
    internals.setupDirtyTracking(form)

    const input = form.querySelector('input')!
    input.value = 'Benny'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(internals.isFormDirty(form)).toBe(true)
    expect(form.hasAttribute('beam-dirty')).toBe(true)
  })
})
