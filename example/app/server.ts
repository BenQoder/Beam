import { Hono } from 'hono'
import { createApp } from 'honox/server'
import { beamCsp } from '@benqoder/beam'
import { beam } from './beam'

const app = createApp({
  init(app) {
    const rpcApp = new Hono()

    app.use('*', async (c, next) => {
      try {
        await next()
      } finally {
        const authToken = c.get('beamAuthToken') as string | undefined
        const scriptNonce = authToken?.split('.')[1] ?? crypto.randomUUID()
        c.header('Content-Security-Policy', beamCsp({ scriptNonce }))
        c.header('X-Content-Type-Options', 'nosniff')
        c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
      }
    })

    // Auth middleware - handles auth AND session automatically
    app.use('*', beam.authMiddleware())
    rpcApp.use('*', beam.authMiddleware())
    rpcApp.use('*', async (c, next) => {
      c.set('rpcTraceId', crypto.randomUUID().slice(0, 8))
      await next()
    })

    // Beam actions still originate from the websocket client, but each RPC call
    // now re-enters this internal Hono app so per-call middleware can run.
    beam.init(app, { rpcMiddlewareApp: rpcApp })
  },
})

export default app
