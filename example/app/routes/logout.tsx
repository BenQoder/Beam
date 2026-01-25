import { createRoute } from 'honox/factory'

// Helper to parse cookies
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
}

// POST /logout - handle logout
export const POST = createRoute(async (c) => {
  const { env } = c.get('beam')

  // Get session from cookies
  const cookies = parseCookies(c.req.header('Cookie'))
  const sessionId = cookies['session']

  if (sessionId) {
    // Delete session from KV
    await env.KV.delete(`session:${sessionId}`)
  }

  // Clear cookie and redirect to login
  c.header('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  return c.redirect('/login')
})

// GET /logout - also support GET for convenience
export default createRoute(async (c) => {
  const { env } = c.get('beam')

  const cookies = parseCookies(c.req.header('Cookie'))
  const sessionId = cookies['session']

  if (sessionId) {
    await env.KV.delete(`session:${sessionId}`)
  }

  c.header('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  return c.redirect('/login')
})
