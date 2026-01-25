import type { AuthResolver, BeamUser } from '@benqoder/beam'
import type { Env } from './types'

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
}

/**
 * Session-based auth resolver.
 * Checks for session cookie and looks up user in KV.
 */
const auth: AuthResolver<Env> = async (request, env) => {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const sessionId = cookies['session']

  if (!sessionId) {
    return null
  }

  // Look up session in KV
  const sessionData = await env.KV.get(`session:${sessionId}`)
  if (!sessionData) {
    return null
  }

  try {
    const user = JSON.parse(sessionData) as BeamUser
    return user
  } catch {
    return null
  }
}

export default auth
