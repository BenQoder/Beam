import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockVisit = vi.fn(async () => ({
  url: 'http://localhost:3000/about',
  finalUrl: 'http://localhost:3000/about',
  status: 200,
  mode: 'visit',
  target: '#app',
  title: 'About',
  documentHtml: '<html><head><title>About</title></head><body><main id="app"><h1>About</h1></main></body></html>',
  assetSignature: '',
  scroll: 'reset',
}))
const mockCall = vi.fn()
const mockRegisterCallback = vi.fn(async () => {})
const mockAuthenticate = vi.fn(async () => ({
  registerCallback: mockRegisterCallback,
  visit: mockVisit,
  call: mockCall,
}))
const mockNewWebSocketRpcSession = vi.fn(() => ({
  authenticate: mockAuthenticate,
}))

vi.mock('capnweb', () => ({
  newWebSocketRpcSession: mockNewWebSocketRpcSession,
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

async function loadClientInternalsWithOptions(options: { disableAutoConnect?: boolean } = {}) {
  vi.resetModules()
  ;(globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__ = options.disableAutoConnect ?? true
  delete (globalThis as any).__BEAM_AUTO_CONNECT__
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
    document.body.removeAttribute('beam-boost')
    document.head.innerHTML = ''
    sessionStorage.clear()
    mockVisit.mockClear()
    mockCall.mockClear()
    mockRegisterCallback.mockClear()
    mockAuthenticate.mockClear()
    mockNewWebSocketRpcSession.mockClear()
    mockVisit.mockResolvedValue({
      url: 'http://localhost:3000/about',
      finalUrl: 'http://localhost:3000/about',
      status: 200,
      mode: 'visit',
      target: '#app',
      title: 'About',
      documentHtml: '<html><head><title>About</title></head><body><main id="app"><h1>About</h1></main></body></html>',
      assetSignature: '',
      scroll: 'reset',
    })
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    mockCall.mockResolvedValue(streamOf())
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.body.removeAttribute('beam-boost')
    sessionStorage.clear()
    document.head.innerHTML = ''
    delete (globalThis as any).__BEAM_DISABLE_AUTO_CONNECT__
    delete (globalThis as any).__BEAM_AUTO_CONNECT__
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not auto-connect by default', async () => {
    const internals = await loadClientInternalsWithOptions({ disableAutoConnect: false })
    expect(internals.shouldAutoConnect()).toBe(false)
  })

  it('supports explicit auto-connect opt-in via meta flag', async () => {
    document.head.innerHTML = `
      <meta name="beam-auto-connect" content="true">
      <meta name="beam-token" content="test-token">
    `
    const internals = await loadClientInternalsWithOptions({ disableAutoConnect: false })
    expect(internals.shouldAutoConnect()).toBe(true)
  })

  it('upgrades descendant links inside beam-boost containers into Beam visits', async () => {
    document.head.innerHTML = '<meta name="beam-token" content="test-token">'
    await loadClientInternals()
    document.body.innerHTML = `
      <main id="app" beam-boost>
        <a id="about-link" href="/about">About</a>
        <div>Home</div>
      </main>
    `

    document.querySelector<HTMLAnchorElement>('#about-link')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    )
    await Promise.resolve()
    await Promise.resolve()

    expect(mockVisit).toHaveBeenCalledWith('http://localhost:3000/about', {
      mode: 'visit',
      target: '#app',
      replace: false,
    })
    expect(document.querySelector('#app')?.textContent).toContain('About')
  })

  it('shows visit loading immediately and clears it after a boosted body swap', async () => {
    document.head.innerHTML = '<meta name="beam-token" content="test-token">'
    document.body.setAttribute('beam-boost', '')
    document.body.innerHTML = `
      <div id="global-loader" beam-loading-for="*">Loading...</div>
      <main id="shell">
        <a id="login-link" href="/login">Login</a>
        <div>Home</div>
      </main>
    `

    let resolveVisit: ((value: Awaited<ReturnType<typeof mockVisit>>) => void) | null = null
    mockVisit.mockImplementationOnce(() => new Promise((resolve) => {
      resolveVisit = resolve
    }))

    await loadClientInternals()

    const beforeVisit = vi.fn()
    const afterVisit = vi.fn()
    window.addEventListener('beam:before-visit', beforeVisit)
    window.addEventListener('beam:after-visit', afterVisit)

    const initialLoader = document.querySelector<HTMLElement>('#global-loader')
    expect(initialLoader?.style.display).toBe('none')

    document.querySelector<HTMLAnchorElement>('#login-link')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    )
    await Promise.resolve()
    await Promise.resolve()

    expect(beforeVisit).toHaveBeenCalled()
    expect(beforeVisit.mock.calls.at(-1)?.[0]).toMatchObject({
      detail: expect.objectContaining({
        url: 'http://localhost:3000/login',
        target: 'body',
      }),
    })
    expect(initialLoader?.style.display).toBe('')

    resolveVisit?.({
      url: 'http://localhost:3000/login',
      finalUrl: 'http://localhost:3000/login',
      status: 200,
      mode: 'visit',
      target: 'body',
      title: 'Login',
      documentHtml: `
        <html>
          <head><title>Login</title></head>
          <body beam-boost>
            <div id="global-loader" beam-loading-for="*">Loading...</div>
            <main id="shell">
              <a id="home-link" href="/">Home</a>
              <h1 id="login-title">Login Page</h1>
            </main>
          </body>
        </html>
      `,
      assetSignature: '',
      scroll: 'reset',
    })
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const nextLoader = document.querySelector<HTMLElement>('#global-loader')
    expect(nextLoader?.style.display).toBe('none')
    expect(afterVisit).toHaveBeenCalled()
    expect(afterVisit.mock.calls.at(-1)?.[0]).toMatchObject({
      detail: expect.objectContaining({
        finalUrl: 'http://localhost:3000/login',
        status: 200,
      }),
    })
    expect(document.querySelector('#login-title')?.textContent).toContain('Login Page')
  })

  it('respects beam-boost-off for links inside boosted containers', async () => {
    document.head.innerHTML = '<meta name="beam-token" content="test-token">'
    await loadClientInternals()
    document.body.innerHTML = `
      <main id="app" beam-boost>
        <a id="plain-link" href="/about" beam-boost-off>About</a>
      </main>
    `

    document.querySelector<HTMLAnchorElement>('#plain-link')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    )
    await Promise.resolve()

    expect(mockVisit).not.toHaveBeenCalled()
  })

  it('applies visit responses by updating title and target content', async () => {
    const internals = await loadClientInternals()
    document.body.innerHTML = '<main id="app" beam-boost><div>Home</div></main>'

    const outcome = await internals.applyVisitResponse({
      url: 'http://localhost:3000/about',
      finalUrl: 'http://localhost:3000/about',
      status: 200,
      mode: 'visit',
      target: '#app',
      title: 'About',
      documentHtml: '<html><head><title>About</title></head><body><main id="app"><h1>About Page</h1></main></body></html>',
      assetSignature: '',
      scroll: 'reset',
    }, '#app')

    expect(outcome).toBe('applied')
    expect(document.title).toBe('About')
    expect(document.querySelector('#app')?.textContent).toContain('About Page')
  })

  it('loads missing next-page runtime assets before applying boosted visits', async () => {
    const internals = await loadClientInternals()
    document.head.innerHTML = `
      <meta name="beam-token" content="test-token">
      <link rel="stylesheet" href="/assets/app.css">
      <link rel="preconnect" href="https://cdn.example.com">
    `
    document.body.innerHTML = '<main id="app" beam-boost><div>Home</div></main>'

    const originalAppendChild = document.head.appendChild.bind(document.head)
    vi.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => {
      const result = originalAppendChild(node)
      if (node instanceof HTMLLinkElement || node instanceof HTMLScriptElement) {
        queueMicrotask(() => node.dispatchEvent(new Event('load')))
      }
      return result
    }) as typeof document.head.appendChild)

    const outcome = await internals.applyVisitResponse({
      url: 'http://localhost:3000/login',
      finalUrl: 'http://localhost:3000/login',
      status: 200,
      mode: 'visit',
      target: '#app',
      title: 'Login',
      documentHtml: `
        <html>
          <head>
            <title>Login</title>
            <meta name="description" content="Login page">
            <link rel="canonical" href="http://localhost:3000/login">
            <link rel="preconnect" href="https://cdn.example.com">
            <link rel="stylesheet" href="/assets/app.css">
            <link rel="stylesheet" href="/assets/login.css">
            <script src="/assets/login.js"></script>
          </head>
          <body>
            <main id="app"><h1>Login Page</h1></main>
          </body>
        </html>
      `,
      assetSignature: '/assets/app.css|/assets/login.css|/assets/login.js',
      scroll: 'reset',
    }, '#app')

    expect(outcome).toBe('applied')
    expect(document.title).toBe('Login')
    expect(document.querySelector('#app')?.textContent).toContain('Login Page')
    expect(document.head.querySelector('link[href="/assets/login.css"]')).not.toBeNull()
    expect(document.head.querySelector('script[src="/assets/login.js"]')).not.toBeNull()
  })

  it('uses explicit visit modes over inherited beam-boost defaults', async () => {
    document.head.innerHTML = '<meta name="beam-token" content="test-token">'
    const internals = await loadClientInternals()
    document.body.innerHTML = `
      <main id="app" beam-boost>
        <a id="patch-link" href="/about?page=2" beam-patch>Next</a>
      </main>
    `

    document.querySelector<HTMLAnchorElement>('#patch-link')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    )
    await Promise.resolve()
    await Promise.resolve()
    document.querySelector<HTMLAnchorElement>('#navigate-link')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    )
    await Promise.resolve()
    await Promise.resolve()

    expect(mockVisit).toHaveBeenNthCalledWith(1, 'http://localhost:3000/about?page=2', {
      mode: 'patch',
      target: '#app',
      replace: false,
    })

    mockVisit.mockClear()
    document.body.innerHTML = `
      <main id="app" beam-boost>
        <a id="navigate-link" href="/login" beam-navigate>Login</a>
      </main>
    `
    document.querySelector<HTMLAnchorElement>('#navigate-link')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    )
    await Promise.resolve()
    await Promise.resolve()

    expect(mockVisit).toHaveBeenCalledWith('http://localhost:3000/login', {
      mode: 'navigate',
      target: '#app',
      replace: false,
    })

    expect(internals.getVisitMode(document.querySelector<HTMLAnchorElement>('#navigate-link')!)).toBe('navigate')
  })

  it('suppresses reconnect when the page is hidden', async () => {
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })

    try {
      const internals = await loadClientInternalsWithOptions({ disableAutoConnect: false })
      expect(internals.canReconnect()).toBe(false)
    } finally {
      if (visibilityDescriptor) {
        Object.defineProperty(document, 'visibilityState', visibilityDescriptor)
      } else {
        delete (document as any).visibilityState
      }
    }
  })

  it('parses out-of-band swaps and applies server state/script/html responses', async () => {
    const internals = await loadClientInternals()
    const { beamReactivity } = await import('../src/reactivity')
    document.body.innerHTML = `
      <div id="target"></div>
      <div id="sidebar"></div>
      <div beam-state='{"message":"Initial"}' beam-id="panelState">
        <span id="message" beam-text="message"></span>
      </div>
    `
    beamReactivity.init()
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

  it('applies modal shell spacing on the backdrop instead of the content container', async () => {
    const internals = await loadClientInternals()

    internals.openModal('<div>Modal body</div>')

    const defaultBackdrop = document.querySelector<HTMLElement>('#modal-backdrop')
    const defaultContent = document.querySelector<HTMLElement>('#modal-content')
    expect(defaultBackdrop).toBeTruthy()
    expect(defaultBackdrop?.style.getPropertyValue('--beam-modal-spacing')).toBe('')
    expect(defaultContent?.getAttribute('style')).toBeNull()

    internals.closeModal()
    vi.advanceTimersByTime(200)

    internals.openModal('<div>Modal body</div>', 'large', 24)

    const spacedBackdrop = document.querySelector<HTMLElement>('#modal-backdrop')
    const spacedContent = document.querySelector<HTMLElement>('#modal-content')
    expect(spacedBackdrop?.style.getPropertyValue('--beam-modal-spacing')).toBe('24px')
    expect(spacedContent?.getAttribute('style')).toBeNull()
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
