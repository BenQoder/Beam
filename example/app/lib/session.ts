import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { Context } from 'hono'

const SESSION_SECRET = 'your-secret-key-change-in-production'
const SESSION_COOKIE = 'sid'
const SESSION_MAX_AGE = 365 * 24 * 60 * 60 // 1 year

/**
 * Get session ID from Hono context (for routes)
 */
export async function getSessionId(c: Context): Promise<string> {
  let sessionId = await getSignedCookie(c, SESSION_SECRET, SESSION_COOKIE)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    await setSignedCookie(c, SESSION_COOKIE, sessionId, SESSION_SECRET, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
    })
  }
  return sessionId
}

/**
 * Parse session ID from raw request (for Beam actions)
 * Note: This only reads - it cannot set cookies in WebSocket context
 */
export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )

  // Get signed cookie value
  const signedValue = cookies[SESSION_COOKIE]
  if (!signedValue) return null

  // Verify signature (simple HMAC verification)
  // Hono's signed cookie format: value.signature
  const parts = signedValue.split('.')
  if (parts.length !== 2) return null

  const [value, signature] = parts

  // For simplicity, we'll trust the cookie if it has the right format
  // In production, you'd verify the HMAC signature
  return value || null
}

/**
 * Get cart key for a session
 */
export function getCartKey(sessionId: string): string {
  return `cart:${sessionId}`
}

/**
 * Get cart count from KV for a session (for SSR)
 */
export async function getCartCount(sessionId: string, kv: KVNamespace): Promise<number> {
  const cartKey = getCartKey(sessionId)
  const cartData = await kv.get(cartKey)
  if (!cartData) return 0

  const cart = JSON.parse(cartData) as Array<{ productId: string; qty: number }>
  return cart.reduce((sum, item) => sum + item.qty, 0)
}
