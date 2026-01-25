import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import { RpcTarget, newWorkersRpcResponse } from 'capnweb'
import type {
  ActionHandler,
  ActionResponse,
  ModalHandler,
  DrawerHandler,
  BeamConfig,
  BeamInstance,
  BeamContext,
  BeamVariables,
  BeamSession,
  SessionConfig,
  SessionStorageFactory,
  RenderOptions,
  AuthTokenPayload,
} from './types'

/** Default token lifetime: 5 minutes */
const DEFAULT_TOKEN_LIFETIME = 5 * 60 * 1000

/**
 * Sign an auth token payload using HMAC-SHA256
 */
async function signToken(payload: AuthTokenPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = JSON.stringify(payload)
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return `${btoa(data)}.${sigBase64}`
}

/**
 * Verify and decode an auth token
 */
async function verifyToken(token: string, secret: string): Promise<AuthTokenPayload | null> {
  try {
    const [dataBase64, sigBase64] = token.split('.')
    if (!dataBase64 || !sigBase64) return null

    const data = atob(dataBase64)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signature = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data))
    if (!valid) return null

    const payload = JSON.parse(data) as AuthTokenPayload

    // Check expiration
    if (payload.exp < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Session implementation using KV storage.
 * Exported for users who need custom storage adapter.
 *
 * @example
 * ```typescript
 * // app/session-storage.ts
 * import { KVSession } from '@benqoder/beam'
 * export default (sessionId: string, env: Env) => new KVSession(sessionId, env.KV)
 * ```
 */
export class KVSession implements BeamSession {
  private sessionId: string
  private kv: KVNamespace

  constructor(sessionId: string, kv: KVNamespace) {
    this.sessionId = sessionId
    this.kv = kv
  }

  private key(k: string): string {
    return `beam:${this.sessionId}:${k}`
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const data = await this.kv.get(this.key(key))
    if (!data) return null
    return JSON.parse(data) as T
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    await this.kv.put(this.key(key), JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(this.key(key))
  }
}

/**
 * Cookie-based session storage (default).
 * Stores all session data in a signed cookie (~4KB limit).
 * Good for: cart, preferences, small state.
 * For larger data, use KVSession or custom storage.
 */
export class CookieSession implements BeamSession {
  private data: Record<string, unknown>
  private _dirty: boolean = false

  constructor(initialData: Record<string, unknown> = {}) {
    this.data = initialData
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.data[key] as T) ?? null
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.data[key] = value
    this._dirty = true
  }

  async delete(key: string): Promise<void> {
    delete this.data[key]
    this._dirty = true
  }

  /** Check if session data has been modified */
  isDirty(): boolean {
    return this._dirty
  }

  /** Get all session data (for serializing to cookie) */
  getData(): Record<string, unknown> {
    return this.data
  }
}

/** Cookie name for session data (separate from session ID) */
const SESSION_DATA_COOKIE = 'beam_data'

/**
 * Parse cookies from raw request (for WebSocket context)
 */
function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return {}

  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
}

/**
 * Parse session ID from raw request cookies (for WebSocket context)
 */
function parseSessionFromRequest(request: Request, cookieName: string): string | null {
  const cookies = parseCookies(request)
  const signedValue = cookies[cookieName]
  if (!signedValue) return null

  // Hono signed cookie format: value.signature
  const parts = signedValue.split('.')
  if (parts.length !== 2) return null

  return parts[0] || null
}

/**
 * Parse session data from raw request cookies (for WebSocket context)
 */
function parseSessionDataFromRequest(request: Request): Record<string, unknown> {
  const cookies = parseCookies(request)
  const signedValue = cookies[SESSION_DATA_COOKIE]
  if (!signedValue) return {}

  // Hono signed cookie format: value.signature
  const parts = signedValue.split('.')
  if (parts.length !== 2) return {}

  try {
    return JSON.parse(decodeURIComponent(parts[0]))
  } catch {
    return {}
  }
}

/**
 * Create a BeamContext with script() and render() helpers
 */
function createBeamContext<TEnv>(base: {
  env: TEnv
  user: import('./types').BeamUser | null
  request: Request
  session: BeamSession
}): BeamContext<TEnv> {
  return {
    ...base,
    script: (code: string): ActionResponse => ({ script: code }),
    render: (html: string | Promise<string>, options?: RenderOptions): ActionResponse | Promise<ActionResponse> => {
      if (html instanceof Promise) {
        return html.then((resolved) => ({
          html: resolved,
          script: options?.script,
          target: options?.target,
          swap: options?.swap,
        }))
      }
      return {
        html,
        script: options?.script,
        target: options?.target,
        swap: options?.swap,
      }
    },
    redirect: (url: string): ActionResponse => ({ redirect: url }),
  }
}

/**
 * Beam RPC Server - extends RpcTarget for capnweb integration
 *
 * This enables:
 * - Promise pipelining (multiple calls in one round-trip)
 * - Bidirectional RPC (server can call client callbacks)
 * - Pass-by-reference (RpcTarget objects stay on origin)
 * - Function callbacks (pass functions over RPC)
 */
class BeamServer<TEnv extends object> extends RpcTarget {
  private ctx: BeamContext<TEnv>
  private actions: Record<string, ActionHandler<TEnv>>
  private modals: Record<string, ModalHandler<TEnv>>
  private drawers: Record<string, DrawerHandler<TEnv>>

  constructor(
    ctx: BeamContext<TEnv>,
    actions: Record<string, ActionHandler<TEnv>>,
    modals: Record<string, ModalHandler<TEnv>>,
    drawers: Record<string, DrawerHandler<TEnv>>
  ) {
    super()
    this.ctx = ctx
    this.actions = actions
    this.modals = modals
    this.drawers = drawers
  }

  /**
   * Call an action handler
   */
  async call(action: string, data: Record<string, unknown> = {}): Promise<ActionResponse> {
    const handler = this.actions[action]
    if (!handler) {
      throw new Error(`Unknown action: ${action}`)
    }
    const result = await handler(this.ctx, data)
    // Normalize string responses to ActionResponse format
    if (typeof result === 'string') {
      return { html: result }
    }
    return result
  }

  /**
   * Open a modal
   */
  async modal(modalId: string, data: Record<string, unknown> = {}): Promise<string> {
    const handler = this.modals[modalId]
    if (!handler) {
      throw new Error(`Unknown modal: ${modalId}`)
    }
    return await handler(this.ctx, data)
  }

  /**
   * Open a drawer
   */
  async drawer(drawerId: string, data: Record<string, unknown> = {}): Promise<string> {
    const handler = this.drawers[drawerId]
    if (!handler) {
      throw new Error(`Unknown drawer: ${drawerId}`)
    }
    return await handler(this.ctx, data)
  }

  /**
   * Register a client callback for server-initiated updates
   * This enables bidirectional communication - server can push to client
   */
  registerCallback(callback: (event: string, data: unknown) => void): void {
    // Store callback for later use by actions that need to push updates
    ;(this as any)._clientCallback = callback
  }

  /**
   * Notify connected client (if callback registered)
   */
  async notify(event: string, data: unknown): Promise<void> {
    const callback = (this as any)._clientCallback
    if (callback) {
      await callback(event, data)
    }
  }
}

/**
 * Creates a Beam instance configured with actions, modals, and drawers.
 * Uses capnweb for RPC, enabling promise pipelining and bidirectional calls.
 *
 * @example
 * ```typescript
 * // app/beam.ts
 * import { createBeam } from '@benqoder/beam'
 * import type { Env } from './types'
 *
 * export const beam = createBeam<Env>({
 *   actions: { createProduct, deleteProduct },
 *   modals: { confirmDelete },
 *   drawers: { productDetails }
 * })
 *
 * // app/server.ts
 * import { createApp } from 'honox/server'
 * import { beam } from './beam'
 *
 * const app = createApp({ init: beam.init })
 * export default app
 * ```
 */
export function createBeam<TEnv extends object = object>(
  config: BeamConfig<TEnv>
): BeamInstance<TEnv> {
  const { actions, modals, drawers = {}, auth, session: sessionConfig } = config

  // Session defaults
  const cookieName = sessionConfig?.cookieName ?? 'beam_sid'
  const maxAge = sessionConfig?.maxAge ?? 365 * 24 * 60 * 60 // 1 year

  return {
    actions,
    modals,
    drawers,
    auth,

    /**
     * Middleware that resolves auth, session, and sets beam context in Hono.
     * Use this to share context between Beam and regular Hono routes.
     *
     * @example
     * ```typescript
     * const app = createApp({
     *   init(app) {
     *     app.use('*', beam.authMiddleware())
     *     beam.init(app)
     *   }
     * })
     *
     * // In a route handler:
     * app.get('/api/products', (c) => {
     *   const { user, session } = c.get('beam')
     *   const cart = await session.get('cart')
     * })
     * ```
     */
    authMiddleware(): MiddlewareHandler<{ Bindings: TEnv; Variables: BeamVariables<TEnv> }> {
      return async (c, next) => {
        // Resolve auth if resolver provided
        const user = auth ? await auth(c.req.raw, c.env) : null

        // Resolve session
        let sessionId: string | null = null
        let session: BeamSession
        let cookieSession: CookieSession | null = null

        if (sessionConfig) {
          // Resolve secret from env if secretEnvKey provided, otherwise use static secret
          const secret = sessionConfig.secretEnvKey
            ? ((c.env as any)[sessionConfig.secretEnvKey] as string)
            : sessionConfig.secret
          if (!secret) {
            throw new Error(
              sessionConfig.secretEnvKey
                ? `Session secret not found in env.${sessionConfig.secretEnvKey}`
                : 'Session secret is required'
            )
          }

          // Get or create session ID
          const cookieValue = await getSignedCookie(c, secret, cookieName)
          sessionId = typeof cookieValue === 'string' ? cookieValue : null
          if (!sessionId) {
            sessionId = crypto.randomUUID()
            await setSignedCookie(c, cookieName, sessionId, secret, {
              maxAge,
              httpOnly: true,
              sameSite: 'Lax',
              path: '/',
            })
          }

          // Use custom storage factory if provided, otherwise use cookie storage
          if (sessionConfig.storageFactory) {
            session = sessionConfig.storageFactory(sessionId, c.env)
          } else {
            // Default: cookie-based session storage
            const existingDataCookie = await getSignedCookie(c, secret, SESSION_DATA_COOKIE)
            let existingData: Record<string, unknown> = {}
            if (typeof existingDataCookie === 'string') {
              try {
                existingData = JSON.parse(existingDataCookie)
              } catch {
                existingData = {}
              }
            }
            cookieSession = new CookieSession(existingData)
            session = cookieSession
          }
        } else {
          // No session config - provide a noop session
          session = {
            get: async () => null,
            set: async () => {},
            delete: async () => {},
          }
        }

        // Create context with script() and render() helpers
        const ctx = createBeamContext<TEnv>({
          env: c.env,
          user,
          request: c.req.raw,
          session,
        })

        // Generate auth token for in-band WebSocket authentication
        const secret = sessionConfig?.secretEnvKey
          ? ((c.env as any)[sessionConfig.secretEnvKey] as string)
          : sessionConfig?.secret
        let authToken = ''
        if (secret && sessionId) {
          const tokenPayload: AuthTokenPayload = {
            sid: sessionId,
            uid: user?.id ?? null,
            exp: Date.now() + DEFAULT_TOKEN_LIFETIME,
          }
          authToken = await signToken(tokenPayload, secret)
        }

        // Set in Hono context for use by routes
        c.set('beam', ctx)
        c.set('beamAuthToken', authToken)

        await next()

        // If using cookie session and data was modified, save it back to cookie
        if (cookieSession && cookieSession.isDirty() && sessionConfig) {
          const secret = sessionConfig.secretEnvKey
            ? ((c.env as any)[sessionConfig.secretEnvKey] as string)
            : sessionConfig.secret
          const dataString = JSON.stringify(cookieSession.getData())
          await setSignedCookie(c, SESSION_DATA_COOKIE, dataString, secret, {
            maxAge,
            httpOnly: true,
            sameSite: 'Lax',
            path: '/',
          })
        }
      }
    },

    /**
     * Generate a short-lived auth token for in-band WebSocket authentication.
     * Use this when you need to generate a token outside of the authMiddleware.
     *
     * @example
     * ```typescript
     * const token = await beam.generateAuthToken(ctx)
     * // Embed in page: <meta name="beam-token" content="${token}">
     * ```
     */
    async generateAuthToken(ctx: BeamContext<TEnv>): Promise<string> {
      if (!sessionConfig) {
        throw new Error('Session config is required for auth token generation')
      }

      const secret = sessionConfig.secretEnvKey
        ? ((ctx.env as any)[sessionConfig.secretEnvKey] as string)
        : sessionConfig.secret

      if (!secret) {
        throw new Error('Session secret is required for auth token generation')
      }

      // Get session ID from request cookies
      const sessionId = parseSessionFromRequest(ctx.request, cookieName)
      if (!sessionId) {
        throw new Error('No session found - ensure authMiddleware is used')
      }

      const tokenPayload: AuthTokenPayload = {
        sid: sessionId,
        uid: ctx.user?.id ?? null,
        exp: Date.now() + DEFAULT_TOKEN_LIFETIME,
      }

      return signToken(tokenPayload, secret)
    },

    /**
     * Init function for HonoX createApp().
     * Registers the WebSocket RPC endpoint using capnweb.
     *
     * SECURITY: Uses in-band authentication pattern to prevent CSWSH attacks.
     * WebSocket connections start unauthenticated, client must call authenticate(token)
     * with a valid token obtained from a same-origin page request.
     *
     * @example
     * ```typescript
     * const app = createApp({
     *   init(app) {
     *     beam.init(app) // defaults to /beam
     *     beam.init(app, { endpoint: '/rpc' }) // custom endpoint
     *   }
     * })
     * ```
     */
    init(app: Hono<{ Bindings: TEnv }>, options?: { endpoint?: string }) {
      const endpoint = options?.endpoint ?? '/beam'

      app.get(endpoint, async (c) => {
        const upgradeHeader = c.req.header('Upgrade')
        if (upgradeHeader !== 'websocket') {
          return c.text('Expected WebSocket', 426)
        }

        // Get the session secret for token verification
        const secret = sessionConfig?.secretEnvKey
          ? ((c.env as any)[sessionConfig.secretEnvKey] as string)
          : sessionConfig?.secret

        if (!secret) {
          return c.text('Session secret is required for secure WebSocket connections', 500)
        }

        // Create PublicBeamServer - client must authenticate to get full API
        const server = new PublicBeamServer(
          secret,
          sessionConfig,
          c.env,
          c.req.raw,
          actions as Record<string, ActionHandler<TEnv>>,
          modals as Record<string, ModalHandler<TEnv>>,
          drawers as Record<string, DrawerHandler<TEnv>>,
          auth
        )

        // Use capnweb to handle the RPC connection
        return newWorkersRpcResponse(c.req.raw, server)
      })
    },
  }
}

/**
 * Public Beam RPC Server - initial unauthenticated API
 *
 * This follows the capnweb in-band authentication pattern:
 * - WebSocket connections start with this unauthenticated API
 * - Client calls authenticate(token) to get the authenticated BeamServer
 * - This prevents Cross-Site WebSocket Hijacking (CSWSH) attacks
 */
class PublicBeamServer<TEnv extends object> extends RpcTarget {
  private secret: string
  private sessionConfig: SessionConfig<TEnv> | undefined
  private env: TEnv
  private request: Request
  private actions: Record<string, ActionHandler<TEnv>>
  private modals: Record<string, ModalHandler<TEnv>>
  private drawers: Record<string, DrawerHandler<TEnv>>
  private auth: ((request: Request, env: TEnv) => Promise<import('./types').BeamUser | null>) | undefined

  constructor(
    secret: string,
    sessionConfig: SessionConfig<TEnv> | undefined,
    env: TEnv,
    request: Request,
    actions: Record<string, ActionHandler<TEnv>>,
    modals: Record<string, ModalHandler<TEnv>>,
    drawers: Record<string, DrawerHandler<TEnv>>,
    auth: ((request: Request, env: TEnv) => Promise<import('./types').BeamUser | null>) | undefined
  ) {
    super()
    this.secret = secret
    this.sessionConfig = sessionConfig
    this.env = env
    this.request = request
    this.actions = actions
    this.modals = modals
    this.drawers = drawers
    this.auth = auth
  }

  /**
   * Authenticate with a token and return the authenticated API
   * This is the only method available on the public API
   */
  async authenticate(token: string): Promise<BeamServer<TEnv>> {
    // Verify the token
    const payload = await verifyToken(token, this.secret)
    if (!payload) {
      throw new Error('Invalid or expired auth token')
    }

    // Resolve auth (user info is embedded in token, but we re-resolve for fresh data)
    const user = this.auth ? await this.auth(this.request, this.env) : null

    // Resolve session
    let session: BeamSession
    if (this.sessionConfig) {
      const cookieName = this.sessionConfig.cookieName ?? 'beam_sid'
      const sessionId = parseSessionFromRequest(this.request, cookieName)

      // Verify session ID matches token
      if (sessionId !== payload.sid) {
        throw new Error('Session mismatch')
      }

      if (sessionId && this.sessionConfig.storageFactory) {
        session = this.sessionConfig.storageFactory(sessionId, this.env)
      } else if (sessionId) {
        const existingData = parseSessionDataFromRequest(this.request)
        session = new CookieSession(existingData)
      } else {
        session = { get: async () => null, set: async () => {}, delete: async () => {} }
      }
    } else {
      session = { get: async () => null, set: async () => {}, delete: async () => {} }
    }

    // Create authenticated context
    const ctx = createBeamContext<TEnv>({
      env: this.env,
      user,
      request: this.request,
      session,
    })

    // Return the authenticated BeamServer
    return new BeamServer(ctx, this.actions, this.modals, this.drawers)
  }
}

/**
 * Generate the auth token meta tag HTML for in-band WebSocket authentication.
 * Call this in your layout/page to inject the token.
 *
 * @example
 * ```tsx
 * // app/routes/_renderer.tsx
 * import { beamTokenMeta } from '@benqoder/beam'
 *
 * export default defineRenderer((c, { Layout, children }) => {
 *   const token = c.get('beamAuthToken')
 *   return (
 *     <html>
 *       <head>
 *         <RawHTML>{beamTokenMeta(token)}</RawHTML>
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   )
 * })
 * ```
 */
export function beamTokenMeta(token: string): string {
  // Escape any quotes in the token for safe HTML embedding
  const escapedToken = token.replace(/"/g, '&quot;')
  return `<meta name="beam-token" content="${escapedToken}">`
}

// Export BeamServer for advanced usage (e.g., extending with custom methods)
export { BeamServer, PublicBeamServer }
