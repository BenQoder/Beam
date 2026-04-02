import { Hono } from 'hono'
import { createApp } from 'honox/server'
import { beam } from 'virtual:beam'

const app = createApp({
  init(app) {
    const rpcApp = new Hono()

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
