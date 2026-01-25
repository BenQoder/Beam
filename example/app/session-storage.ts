import { KVSession } from '@benqoder/beam'

// Custom KV-based session storage
// This persists session data to KV instead of cookies
// Required for actions that modify session via WebSocket (can't set cookies)
export default (sessionId: string, env: { KV: KVNamespace }) => new KVSession(sessionId, env.KV)
