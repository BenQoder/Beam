import type { Hono, MiddlewareHandler } from 'hono'

/**
 * User type - customize per app via module augmentation
 */
export interface BeamUser {
  id: string
  [key: string]: unknown // extensible
}

/**
 * Session interface - abstracts away session ID management
 * Uses KV storage under the hood
 */
export interface BeamSession {
  /** Get value from session */
  get<T = unknown>(key: string): Promise<T | null>
  /** Set value in session */
  set<T = unknown>(key: string, value: T): Promise<void>
  /** Delete value from session */
  delete(key: string): Promise<void>
}

/**
 * Render options for ctx.render()
 */
export interface RenderOptions {
  /** JavaScript to execute on client after rendering */
  script?: string
  /** CSS selector for target element (overrides frontend target) */
  target?: string
  /** Swap mode: 'replace' | 'append' | 'prepend' | 'delete' */
  swap?: string
}

/**
 * Context passed to all handlers
 */
export interface BeamContext<TEnv = object> {
  env: TEnv
  user: BeamUser | null // null = guest
  request: Request // original request for headers/cookies
  session: BeamSession // session storage (uses KV)

  /**
   * Return JavaScript to execute on the client (no DOM update)
   * @example ctx.script('showToast("Success!")')
   */
  script(code: string): ActionResponse

  /**
   * Return HTML with optional script to execute.
   * Accepts JSX directly (converts to string), single string, or array for multi-target rendering.
   * @example ctx.render(<ProductList />, { script: 'playSound("ding")' })
   * @example ctx.render([<StatsWidget />, <NotificationList />], { target: '#stats, #notifications' })
   * @example ctx.render([<div id="stats">...</div>, <div beam-id="notifications">...</div>]) // auto-detects targets by id / beam-id / beam-item-id (priority: id → beam-id → beam-item-id)
   */
  render(
    content: string | Promise<string> | (string | Promise<string>)[],
    options?: RenderOptions
  ): ActionResponse | Promise<ActionResponse>

  /**
   * Redirect the client to a new URL
   * @example ctx.redirect('/dashboard')
   * @example ctx.redirect('https://example.com')
   */
  redirect(url: string): ActionResponse

  /**
   * Open a modal with HTML content
   * @example ctx.modal(render(<MyModal />))
   * @example ctx.modal(render(<MyModal />), { size: 'large', spacing: 20 })
   */
  modal(html: string | Promise<string>, options?: { size?: string; spacing?: number }): ActionResponse | Promise<ActionResponse>

  /**
   * Open a drawer with HTML content
   * @example ctx.drawer(render(<MyDrawer />))
   * @example ctx.drawer(render(<MyDrawer />), { position: 'left', size: 'large', spacing: 20 })
   */
  drawer(html: string | Promise<string>, options?: { position?: string; size?: string; spacing?: number }): ActionResponse | Promise<ActionResponse>
}

/**
 * Auth resolver function - user provides this to extract user from request
 */
export type AuthResolver<TEnv = object> = (
  request: Request,
  env: TEnv
) => Promise<BeamUser | null>

/**
 * Auth token payload - signed and short-lived
 * Used for secure in-band WebSocket authentication
 */
export interface AuthTokenPayload {
  /** Session ID */
  sid: string
  /** User ID (null for guest) */
  uid: string | null
  /** Expiration timestamp (ms) */
  exp: number
}

/**
 * Auth token configuration
 */
export interface AuthTokenConfig {
  /** Token lifetime in milliseconds (default: 5 minutes) */
  tokenLifetime?: number
}

/**
 * Modal options for ActionResponse
 */
export interface ModalOptions {
  html: string
  size?: string
  spacing?: number
}

/**
 * Drawer options for ActionResponse
 */
export interface DrawerOptions {
  html: string
  position?: string
  size?: string
  spacing?: number
}

/**
 * Response type for actions - can include HTML and/or script to execute
 */
export interface ActionResponse {
  /** HTML to render (optional) - single string or array of HTML strings for multi-target rendering */
  html?: string | string[]
  /** JavaScript to execute on client (optional) */
  script?: string
  /** URL to redirect to (optional) */
  redirect?: string
  /** CSS selector for target element (optional - overrides frontend target). Can be comma-separated for array html: "#a, #b, #c" */
  target?: string
  /** Swap mode: 'replace' | 'append' | 'prepend' | 'delete' (optional) */
  swap?: string
  /** Open a modal with HTML content */
  modal?: string | ModalOptions
  /** Open a drawer with HTML content */
  drawer?: string | DrawerOptions
}

/**
 * Type for action handlers - receives context and data, returns ActionResponse
 */
export type ActionHandler<TEnv = object> = (
  ctx: BeamContext<TEnv>,
  data: Record<string, unknown>
) => Promise<ActionResponse> | ActionResponse

/**
 * Factory function to create a session storage adapter.
 * Called with the session ID and environment, returns a BeamSession implementation.
 *
 * @example
 * ```typescript
 * // Custom KV storage
 * const kvStorage: SessionStorageFactory<Env> = (sessionId, env) =>
 *   new KVSession(sessionId, env.KV)
 * ```
 */
export type SessionStorageFactory<TEnv = object> = (
  sessionId: string,
  env: TEnv
) => BeamSession

/**
 * Session configuration
 */
export interface SessionConfig<TEnv = object> {
  /** Secret key for signing session cookies (can be empty if secretEnvKey is provided) */
  secret: string
  /** Environment variable name containing the secret (used at runtime) */
  secretEnvKey?: string
  /** Cookie name (default: 'beam_sid') */
  cookieName?: string
  /** Cookie max age in seconds (default: 1 year) */
  maxAge?: number
  /** Custom storage factory (default: cookie storage) */
  storageFactory?: SessionStorageFactory<TEnv>
}

/**
 * Configuration for createBeam
 */
export interface BeamConfig<TEnv = object> {
  actions: Record<string, ActionHandler<TEnv>>
  auth?: AuthResolver<TEnv> // Optional - defaults to null user
  /** Session config - default uses cookie storage, or provide storageFactory for custom storage */
  session?: SessionConfig<TEnv>
}

/**
 * Options for beam.init()
 */
export interface BeamInitOptions {
  /** WebSocket endpoint path (default: '/beam') */
  endpoint?: string
}

/**
 * Hono context variables set by beam.authMiddleware()
 * Use with: c.get('beam').user, c.get('beam').env, c.get('beam').request
 */
export interface BeamVariables<TEnv = object> {
  beam: BeamContext<TEnv>
  /** Short-lived auth token for in-band WebSocket authentication */
  beamAuthToken: string
}

/**
 * The Beam instance returned by createBeam
 */
export interface BeamInstance<TEnv extends object = object> {
  actions: Record<string, ActionHandler<TEnv>>
  /** Auth resolver (if provided) */
  auth: AuthResolver<TEnv> | undefined
  /** Init function for HonoX createApp({ init(app) { beam.init(app, options) } }) */
  init: (app: Hono<{ Bindings: TEnv }>, options?: BeamInitOptions) => void
  /** Middleware that resolves auth and sets beamUser/beamContext in Hono context */
  authMiddleware: () => MiddlewareHandler<{ Bindings: TEnv; Variables: BeamVariables<TEnv> }>
  /**
   * Generate a short-lived auth token for in-band WebSocket authentication.
   * This token should be embedded in the page and used by the client to authenticate.
   * @param ctx - The Beam context (from authMiddleware)
   * @returns A signed, short-lived token string
   */
  generateAuthToken: (ctx: BeamContext<TEnv>) => Promise<string>
}
