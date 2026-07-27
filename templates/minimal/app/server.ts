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
        c.header('Content-Security-Policy', beamCsp({ scriptNonce: crypto.randomUUID() }))
        c.header('X-Content-Type-Options', 'nosniff')
        c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
      }
    })
    app.use('*', beam.authMiddleware())
    rpcApp.use('*', beam.authMiddleware())
    beam.init(app, { rpcMiddlewareApp: rpcApp })
  },
})

export default app
