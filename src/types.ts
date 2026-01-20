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
 * Context passed to all handlers
 */
export interface BeamContext<TEnv = object> {
  env: TEnv
  user: BeamUser | null // null = guest
  request: Request // original request for headers/cookies
  session: BeamSession // session storage (uses KV)
}

/**
 * Auth resolver function - user provides this to extract user from request
 */
export type AuthResolver<TEnv = object> = (
  request: Request,
  env: TEnv
) => Promise<BeamUser | null>

/**
 * Type for action handlers - receives context and data, returns HTML string
 */
export type ActionHandler<TEnv = object> = (
  ctx: BeamContext<TEnv>,
  data: Record<string, unknown>
) => Promise<string>

/**
 * Type for modal handlers - receives context and params, returns HTML string
 */
export type ModalHandler<TEnv = object> = (
  ctx: BeamContext<TEnv>,
  params: Record<string, unknown>
) => Promise<string>

/**
 * Type for drawer handlers - receives context and params, returns HTML string
 */
export type DrawerHandler<TEnv = object> = (
  ctx: BeamContext<TEnv>,
  params: Record<string, unknown>
) => Promise<string>

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
  modals: Record<string, ModalHandler<TEnv>>
  drawers?: Record<string, DrawerHandler<TEnv>>
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
}

/**
 * The Beam instance returned by createBeam
 */
export interface BeamInstance<TEnv extends object = object> {
  actions: Record<string, ActionHandler<TEnv>>
  modals: Record<string, ModalHandler<TEnv>>
  drawers: Record<string, DrawerHandler<TEnv>>
  /** Auth resolver (if provided) */
  auth: AuthResolver<TEnv> | undefined
  /** Init function for HonoX createApp({ init(app) { beam.init(app, options) } }) */
  init: (app: Hono<{ Bindings: TEnv }>, options?: BeamInitOptions) => void
  /** Middleware that resolves auth and sets beamUser/beamContext in Hono context */
  authMiddleware: () => MiddlewareHandler<{ Bindings: TEnv; Variables: BeamVariables<TEnv> }>
}
