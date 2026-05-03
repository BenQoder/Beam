import { Hono } from 'hono'
import { createApp } from 'honox/server'
import { beam } from 'virtual:beam'

const app = createApp({
  init(app) {
    const rpcApp = new Hono()
    app.use('*', beam.authMiddleware())
    rpcApp.use('*', beam.authMiddleware())
    beam.init(app, { rpcMiddlewareApp: rpcApp })
  },
})

export default app
