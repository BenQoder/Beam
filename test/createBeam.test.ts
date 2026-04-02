import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BeamServer,
  CookieSession,
  KVSession,
  PublicBeamServer,
  __beamCreateBeamInternals,
  beamTokenMeta,
  createBeam,
} from '../src/createBeam'
import {
  BEAM_ACTION_REQUEST_HEADER,
  BEAM_ACTION_STREAM_CONTENT_TYPE,
} from '../src/actionStream'

describe('createBeam server utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('CookieSession reads, writes, deletes, and marks dirty state', async () => {
    const session = new CookieSession({ cart: 1 })
    expect(await session.get('cart')).toBe(1)
    expect(session.isDirty()).toBe(false)

    await session.set('cart', 2)
    expect(await session.get('cart')).toBe(2)
    expect(session.isDirty()).toBe(true)

    await session.delete('cart')
    expect(await session.get('cart')).toBeNull()
  })

  it('KVSession serializes values through the KV API', async () => {
    const store = new Map<string, string>()
    const kv = {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        store.set(key, value)
      }),
      delete: vi.fn(async (key: string) => {
        store.delete(key)
      }),
    } as unknown as KVNamespace

    const session = new KVSession('abc', kv)
    await session.set('user', { name: 'Ben' })
    expect(await session.get('user')).toEqual({ name: 'Ben' })
    await session.delete('user')
    expect(await session.get('user')).toBeNull()
  })

  it('beamTokenMeta escapes quotes', () => {
    expect(beamTokenMeta('a"b')).toBe('<meta name="beam-token" content="a&quot;b">')
  })

  it('signs and verifies tokens, rejecting expired tokens', async () => {
    const { signToken, verifyToken } = __beamCreateBeamInternals
    const validPayload = { sid: 'sid-1', uid: 'u1', exp: Date.now() + 10_000 }
    const expiredPayload = { sid: 'sid-1', uid: 'u1', exp: Date.now() - 10_000 }

    const token = await signToken(validPayload, 'secret')
    const expiredToken = await signToken(expiredPayload, 'secret')

    expect(await verifyToken(token, 'secret')).toEqual(validPayload)
    expect(await verifyToken(token, 'wrong-secret')).toBeNull()
    expect(await verifyToken(expiredToken, 'secret')).toBeNull()
  })

  it('computes asset signatures from runtime assets only and decodes HTML entities', () => {
    const { computeAssetSignature } = __beamCreateBeamInternals

    const signature = computeAssetSignature(`
      <meta name="description" content="Login page">
      <link rel="preconnect" href="https://cdn.example.com">
      <link rel="icon" href="/favicon.ico">
      <link rel="stylesheet" href="/assets/app.css?v=1&amp;theme=light">
      <link rel="modulepreload" href="/assets/chunk.js">
      <link rel="preload" as="script" href="/assets/entry.js">
      <script src="/assets/runtime.js?foo=1&amp;bar=2"></script>
    `)

    expect(signature).toBe([
      '/assets/app.css?v=1&theme=light',
      '/assets/chunk.js',
      '/assets/entry.js',
      '/assets/runtime.js?foo=1&bar=2',
    ].join('|'))
  })

  it('createBeamContext helper methods normalize responses', async () => {
    const ctx = __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: null,
      request: new Request('https://example.com'),
      session: new CookieSession(),
    })

    expect(ctx.state('cart', { count: 2 })).toEqual({ state: { cart: { count: 2 } } })
    expect(ctx.state({ cart: { count: 2 }, status: 'ok' })).toEqual({
      state: { cart: { count: 2 }, status: 'ok' },
    })
    expect(ctx.script('window.x = 1')).toEqual({ script: 'window.x = 1' })
    expect(await ctx.render('hello', { target: '#app', swap: 'append', script: 'x()' })).toEqual({
      html: 'hello',
      target: '#app',
      swap: 'append',
      script: 'x()',
    })
    expect(await ctx.modal('modal body', { size: 'large', spacing: 24 })).toEqual({
      modal: { html: 'modal body', size: 'large', spacing: 24 },
    })
    expect(await ctx.drawer('drawer body', { position: 'left', size: 'small', spacing: 12 })).toEqual({
      drawer: { html: 'drawer body', position: 'left', size: 'small', spacing: 12 },
    })
  })

  it('BeamServer.call supports plain results and async generators', async () => {
    const ctx = __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: null,
      request: new Request('https://example.com'),
      session: new CookieSession(),
    })

    const server = new BeamServer(ctx, {
      greet: () => 'hello',
      stream: async function* () {
        yield { html: 'first' }
        yield 'second'
      },
    })

    const readAll = async (stream: ReadableStream<any>) => {
      const reader = stream.getReader()
      const values: any[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        values.push(value)
      }
      return values
    }

    expect(await readAll(server.call('greet'))).toEqual([{ html: 'hello' }])
    expect(await readAll(server.call('stream'))).toEqual([{ html: 'first' }, { html: 'second' }])
  })

  it('BeamServer.call routes through the configured action fetcher when available', async () => {
    const ctx = __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: null,
      request: new Request('https://example.com/beam', {
        headers: { Cookie: 'beam_sid=session123.sig' },
      }),
      session: new CookieSession(),
    })

    const actionFetcher = vi.fn(async (request: Request) => {
      expect(request.url).toBe('https://example.com/beam/actions/greet')
      expect(request.headers.get(BEAM_ACTION_REQUEST_HEADER)).toBe('action')
      expect(request.headers.get('content-type')).toContain('application/json')
      expect(await request.json()).toEqual({ name: 'Beam' })

      return new Response('{"html":"from route"}\n', {
        headers: { 'content-type': BEAM_ACTION_STREAM_CONTENT_TYPE },
      })
    })

    const server = new BeamServer(ctx, {
      greet: () => 'direct',
    }, undefined, actionFetcher as any, '/beam/actions')

    const reader = server.call('greet', { name: 'Beam' }).getReader()
    const values: any[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      values.push(value)
    }
    reader.releaseLock()

    expect(actionFetcher).toHaveBeenCalledTimes(1)
    expect(values).toEqual([{ html: 'from route' }])
  })

  it('BeamServer.visit returns a structured visit payload for SSR routes', async () => {
    const ctx = __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: null,
      request: new Request('https://example.com/beam', {
        headers: { Cookie: 'beam_sid=session123.sig' },
      }),
      session: new CookieSession(),
    })

    const routeFetcher = vi.fn(async (request: Request) => {
      expect(request.headers.get('X-Beam-Visit')).toBe('true')
      expect(request.headers.get('X-Beam-Visit-Mode')).toBe('navigate')
      expect(request.headers.get('X-Beam-Visit-Target')).toBe('#app')
      return new Response(
        '<html><head><title>About</title><meta name="beam-token" content="fresh-token"><link rel="stylesheet" href="/app.css"></head><body><main id="app"><h1>About</h1></main></body></html>',
        {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }
      )
    })

    const server = new BeamServer(ctx, {}, routeFetcher as any)
    const response = await server.visit('/about', { mode: 'navigate', target: '#app' })

    expect(response).toMatchObject({
      url: 'https://example.com/about',
      finalUrl: 'https://example.com/about',
      status: 200,
      mode: 'navigate',
      target: '#app',
      title: 'About',
      scroll: 'reset',
    })
    expect(response.documentHtml).toContain('<main id="app"><h1>About</h1></main>')
    expect(response.assetSignature).toContain('/app.css')
  })

  it('BeamServer.visit surfaces redirects and non-html fallbacks', async () => {
    const ctx = __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: null,
      request: new Request('https://example.com/beam'),
      session: new CookieSession(),
    })

    const redirecting = new BeamServer(ctx, {}, vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: '/login' },
    })) as any)
    const redirectResponse = await redirecting.visit('/account', { mode: 'visit' })
    expect(redirectResponse.redirect).toBe('https://example.com/login')

    const nonHtml = new BeamServer(ctx, {}, vi.fn(async () => new Response('ok', {
      headers: { 'content-type': 'application/json' },
    })) as any)
    const nonHtmlResponse = await nonHtml.visit('/api/demo', { mode: 'visit' })
    expect(nonHtmlResponse.reload).toBe(true)
    expect(nonHtmlResponse.reason).toBe('non-html-response')
  })

  it('BeamServer.visit forces hard reload when the route writes cookies', async () => {
    const ctx = __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: null,
      request: new Request('https://example.com/beam'),
      session: new CookieSession(),
    })

    const cookieResponse = new Response('<html><body><main id="app">Ok</main></body></html>', {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'set-cookie': 'beam_sid=fresh.sig; Path=/; HttpOnly',
      },
    })

    const server = new BeamServer(ctx, {}, vi.fn(async () => cookieResponse) as any)
    const visitResponse = await server.visit('/login', { mode: 'navigate', target: '#app' })

    expect(visitResponse.reload).toBe(true)
    expect(visitResponse.reason).toBe('set-cookie-response')
  })

  it('generateAuthToken requires session config and a signed session cookie', async () => {
    const beam = createBeam({
      actions: {},
      session: { secret: 'secret' },
    })

    const ctx = __beamCreateBeamInternals.createBeamContext({
      env: {},
      user: { id: 'u1' },
      request: new Request('https://example.com', {
        headers: { Cookie: 'beam_sid=session123.sig' },
      }),
      session: new CookieSession(),
    })

    const token = await beam.generateAuthToken(ctx)
    const payload = await __beamCreateBeamInternals.verifyToken(token, 'secret')
    expect(payload?.sid).toBe('session123')
    expect(payload?.uid).toBe('u1')

    const beamWithoutSession = createBeam({ actions: {} })
    await expect(beamWithoutSession.generateAuthToken(ctx as any)).rejects.toThrow('Session config is required')
  })

  it('PublicBeamServer authenticates and returns a working BeamServer', async () => {
    const token = await __beamCreateBeamInternals.signToken(
      { sid: 'session123', uid: null, exp: Date.now() + 10_000 },
      'secret'
    )

    const publicServer = new PublicBeamServer(
      'secret',
      { secret: 'secret' },
      {},
      new Request('https://example.com', {
        headers: { Cookie: 'beam_sid=session123.sig; beam_data=%7B%22count%22%3A1%7D.sig' },
      }),
      {
        update: (ctx) => ctx.state('cart', { count: 2 }),
      },
      undefined
    )

    const authenticated = await publicServer.authenticate(token)
    const reader = authenticated.call('update').getReader()
    const { value } = await reader.read()
    reader.releaseLock()

    expect(value).toEqual({ state: { cart: { count: 2 } } })
  })

  it('init registers the websocket endpoint on a Hono app', async () => {
    const beam = createBeam({
      actions: {},
      session: { secret: 'secret' },
    })

    const app = new Hono()
    beam.init(app, { endpoint: '/rpc' })

    const upgradeReq = new Request('https://example.com/rpc', {
      headers: { Upgrade: 'not-websocket' },
    })
    const res = await app.request(upgradeReq)
    expect(res.status).toBe(426)
    expect(await res.text()).toBe('Expected WebSocket')
  })

  it('init wires rpcMiddlewareApp for internal action fetches without exposing a public route', async () => {
    const beam = createBeam({
      actions: {
        greet: (_ctx, data) => ({ html: `Hello ${String(data.name ?? 'guest')}` }),
      },
    })

    const app = new Hono()
    const rpcApp = new Hono()
    const middlewareSpy = vi.fn()

    rpcApp.use('*', async (c, next) => {
      middlewareSpy(c.req.path)
      await next()
    })

    beam.init(app, { endpoint: '/rpc', rpcMiddlewareApp: rpcApp })

    const internalRes = await rpcApp.request('https://example.com/rpc/actions/greet', {
      method: 'POST',
      headers: {
        [BEAM_ACTION_REQUEST_HEADER]: 'action',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Beam' }),
    })

    expect(internalRes.status).toBe(200)
    expect(middlewareSpy).toHaveBeenCalledWith('/rpc/actions/greet')
    expect(internalRes.headers.get('content-type')).toContain(BEAM_ACTION_STREAM_CONTENT_TYPE)
    expect(await internalRes.text()).toBe('{"html":"Hello Beam"}\n')

    const publicRes = await app.request('https://example.com/rpc/actions/greet', {
      method: 'POST',
      headers: {
        [BEAM_ACTION_REQUEST_HEADER]: 'action',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Beam' }),
    })

    expect(publicRes.status).toBe(404)
  })

  it('exposes the live Hono request context inside actions routed through rpcMiddlewareApp', async () => {
    const beam = createBeam({
      actions: {
        greet: (ctx) => ({
          html: `${ctx.requestContext?.req.param('action')}:${(ctx.requestContext as any)?.get('traceId')}`,
        }),
      },
    })

    const app = new Hono()
    const rpcApp = new Hono()

    rpcApp.use('*', async (c, next) => {
      c.set('traceId', 'trace-123' as any)
      await next()
    })

    beam.init(app, { endpoint: '/rpc', rpcMiddlewareApp: rpcApp })

    const res = await rpcApp.request('https://example.com/rpc/actions/greet', {
      method: 'POST',
      headers: {
        [BEAM_ACTION_REQUEST_HEADER]: 'action',
        'content-type': 'application/json',
      },
      body: '{}',
    })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"html":"greet:trace-123"}\n')
  })
})
