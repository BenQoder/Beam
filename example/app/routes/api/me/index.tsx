import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  const ctx = (c.var as any).beam
  return c.json({
    authenticated: !!ctx?.user,
    user: ctx?.user ?? 'guest',
    hasDB: !!ctx?.env?.DB,
    hasKV: !!ctx?.env?.KV,
  })
})
