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
})
