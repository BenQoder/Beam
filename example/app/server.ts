import { createApp } from 'honox/server'
import { beam } from 'virtual:beam'

const app = createApp({
  init(app) {
    // Auth middleware - handles auth AND session automatically
    app.use('*', beam.authMiddleware())

    // Initialize beam WebSocket endpoint
    beam.init(app)
  },
})

export default app
