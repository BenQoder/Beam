import type { Context, Env as HonoEnv, Hono, MiddlewareHandler } from 'hono';
import type { BeamRegisteredActionModules } from './index';
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type RegisteredActionMap = keyof BeamRegisteredActionModules extends never ? {} : UnionToIntersection<BeamRegisteredActionModules[keyof BeamRegisteredActionModules]>;
/** Names of actions known to the generated registry (never when no codegen) */
export type RegisteredActionName = {
    [K in keyof RegisteredActionMap]: RegisteredActionMap[K] extends (...args: never[]) => unknown ? K : never;
}[keyof RegisteredActionMap] & string;
/** All callable action names: the registered union, or string without codegen */
export type BeamActionName = [RegisteredActionName] extends [never] ? string : RegisteredActionName;
/** Params type of a registered action's second argument (data) */
export type BeamActionParams<N extends string> = N extends RegisteredActionName ? RegisteredActionMap[N] extends (ctx: never, data: infer D, ...rest: never[]) => unknown ? unknown extends D ? Record<string, unknown> : D : Record<string, unknown> : Record<string, unknown>;
type ActionChunk<R> = R extends AsyncGenerator<infer Y, unknown, unknown> ? Awaited<Y> : Awaited<R>;
/** ctx.json payload type produced by a registered action (unknown otherwise) */
export type BeamActionJson<N extends string> = N extends RegisteredActionName ? RegisteredActionMap[N] extends (...args: never[]) => infer R ? Extract<ActionChunk<R>, {
    json: unknown;
}> extends {
    json: infer J;
} ? J : unknown : unknown : unknown;
/**
 * User type - customize per app via module augmentation
 */
export interface BeamUser {
    id: string;
    [key: string]: unknown;
}
/**
 * Session interface - abstracts away session ID management
 * Uses KV storage under the hood
 */
export interface BeamSession {
    /** Get value from session */
    get<T = unknown>(key: string): Promise<T | null>;
    /** Set value in session */
    set<T = unknown>(key: string, value: T): Promise<void>;
    /** Delete value from session */
    delete(key: string): Promise<void>;
}
/**
 * Render options for ctx.render()
 */
export interface RenderOptions {
    /** JavaScript to execute on client after rendering */
    script?: string;
    /** CSS selector for target element (overrides frontend target) */
    target?: string;
    /** Swap mode: 'replace' | 'append' | 'prepend' | 'delete' */
    swap?: string;
}
export interface NamedStateUpdates {
    [id: string]: unknown;
}
/**
 * React island props updates keyed by the island's beam-id
 */
export interface IslandPropsUpdates {
    [id: string]: Record<string, unknown>;
}
/**
 * Options for server-driven island creation (ctx.island upsert form)
 */
export interface IslandMountOptions {
    /** Component name (registry) — required when the island doesn't exist yet */
    component?: string;
    /** Runtime module URL (dynamic islands) — must match an allowed source prefix */
    src?: string;
    /** CSS selector to create the island in — required when it doesn't exist yet */
    target?: string;
    /** How to insert into the target: append (default), prepend, or replace its content */
    swap?: 'append' | 'prepend' | 'replace';
    /** Mount strategy for the created island */
    load?: 'eager' | 'visible' | 'idle';
}
/**
 * Server-driven island upserts keyed by beam-id: update props when mounted,
 * create the island in `target` when not.
 */
export interface IslandUpserts {
    [id: string]: IslandMountOptions & {
        props?: Record<string, unknown>;
    };
}
/**
 * Named event pushed to the client (dispatched as 'beam:server-event')
 */
export interface BeamServerEvent {
    name: string;
    data?: unknown;
}
/**
 * Action failure details delivered to the client. Dev builds include the
 * server stack; production sends an opaque failure instead.
 */
export interface BeamActionError {
    action?: string;
    message: string;
    stack?: string;
}
export type VisitMode = 'visit' | 'patch' | 'navigate';
export interface VisitOptions {
    mode?: VisitMode;
    target?: string;
    replace?: boolean;
}
export interface VisitResponse {
    url: string;
    finalUrl: string;
    status: number;
    mode: VisitMode;
    target?: string;
    replace?: boolean;
    redirect?: string;
    reload?: boolean;
    reason?: string;
    title?: string;
    headHtml?: string;
    documentHtml?: string;
    assetSignature?: string;
    scroll?: 'preserve' | 'reset';
}
/**
 * Context passed to all handlers
 */
export interface BeamContext<TEnv = object> {
    env: TEnv;
    user: BeamUser | null;
    request: Request;
    /** Live Hono request context when the action is executed through Beam's internal request pipeline */
    requestContext?: Context;
    session: BeamSession;
    /**
     * Update one or more named reactive states on the client.
     * Targets existing beam-id scopes that may also be referenced by beam-state-ref.
     * @example ctx.state('cart', { items: 3, total: 29.99 })
     * @example ctx.state({ cart: { items: 3 }, sharedCount: 12 })
     */
    state(id: string, value: unknown): ActionResponse;
    state(updates: NamedStateUpdates): ActionResponse;
    /**
     * Update the props of one or more mounted React islands (by beam-id).
     * The island re-renders with the new props while keeping its local React state.
     * With options, becomes an upsert: creates the island in `options.target`
     * when it is not on the page yet.
     * @example ctx.island('salesChart', { series })
     * @example ctx.island({ salesChart: { series }, cartBadge: { count: 3 } })
     * @example ctx.island('recs', { items }, { component: 'RecRail', target: '#below-cart' })
     */
    island(id: string, props: Record<string, unknown>): ActionResponse;
    island(updates: IslandPropsUpdates): ActionResponse;
    island(id: string, props: Record<string, unknown>, options: IslandMountOptions): ActionResponse;
    /**
     * Remove one or more islands (by beam-id): unmounts the React root and
     * deletes the element from the DOM.
     * @example ctx.removeIsland('recs')
     * @example ctx.removeIsland('recs', 'promoBanner')
     */
    removeIsland(...ids: string[]): ActionResponse;
    /**
     * Return plain JSON to the caller — no DOM update, no state, no events.
     * The value resolves the calling side's promise (useBeamAction / window.beam),
     * private to that caller. In streaming actions, yield it last: the caller
     * receives the final chunk. Generic so typed-action codegen can infer the
     * payload type at the call site.
     * @example return ctx.json(await db.search(q))
     */
    json<T>(value: T): ActionResponse & {
        json: T;
    };
    /**
     * Push a named event to the client (dispatched as 'beam:server-event',
     * received by useBeamEvent / window listeners). Works from streaming
     * generators too — yield it whenever you want.
     * @example yield ctx.event('order:shipped', { orderId })
     */
    event(name: string, data?: unknown): ActionResponse;
    /**
     * Fire-and-forget push to this client outside the response stream.
     * Available on the live WebSocket session (undefined in the per-call
     * HTTP middleware pipeline) — prefer ctx.event() for transport-agnostic pushes.
     * @example await ctx.notify?.('job:progress', { pct: 40 })
     */
    notify?: (event: string, data?: unknown) => Promise<void>;
    /**
     * Return JavaScript to execute on the client (no DOM update)
     * @example ctx.script('showToast("Success!")')
     */
    script(code: string): ActionResponse;
    /**
     * Return HTML with optional script to execute.
     * Accepts JSX directly (converts to string), single string, or array for multi-target rendering.
     * @example ctx.render(<ProductList />, { script: 'playSound("ding")' })
     * @example ctx.render([<StatsWidget />, <NotificationList />], { target: '#stats, #notifications' })
     * @example ctx.render([<div id="stats">...</div>, <div beam-id="notifications">...</div>]) // auto-detects targets by id / beam-id / beam-item-id (priority: id → beam-id → beam-item-id)
     */
    render(content: string | Promise<string> | (string | Promise<string>)[], options?: RenderOptions): ActionResponse | Promise<ActionResponse>;
    /**
     * Redirect the client to a new URL
     * @example ctx.redirect('/dashboard')
     * @example ctx.redirect('https://example.com')
     */
    redirect(url: string): ActionResponse;
    /**
     * Open a modal with HTML content
     * @example ctx.modal(render(<MyModal />))
     * @example ctx.modal(render(<MyModal />), { size: 'large', spacing: 20 })
     */
    modal(html: string | Promise<string>, options?: {
        size?: string;
        spacing?: number;
    }): ActionResponse | Promise<ActionResponse>;
    /**
     * Open a drawer with HTML content
     * @example ctx.drawer(render(<MyDrawer />))
     * @example ctx.drawer(render(<MyDrawer />), { position: 'left', size: 'large', spacing: 20 })
     */
    drawer(html: string | Promise<string>, options?: {
        position?: string;
        size?: string;
        spacing?: number;
    }): ActionResponse | Promise<ActionResponse>;
}
export interface BeamResolvedRequest<TEnv = object> {
    ctx: BeamContext<TEnv>;
    user: BeamUser | null;
    sessionId: string | null;
    authToken: string;
    sessionSecret?: string;
    cookieSession: {
        isDirty(): boolean;
        getData(): Record<string, unknown>;
    } | null;
}
/**
 * Auth resolver function - user provides this to extract user from request
 */
export type AuthResolver<TEnv = object> = (request: Request, env: TEnv) => Promise<BeamUser | null>;
/**
 * Auth token payload - signed and short-lived
 * Used for secure in-band WebSocket authentication
 */
export interface AuthTokenPayload {
    /** Session ID */
    sid: string;
    /** User ID (null for guest) */
    uid: string | null;
    /** Expiration timestamp (ms) */
    exp: number;
}
/**
 * Auth token configuration
 */
export interface AuthTokenConfig {
    /** Token lifetime in milliseconds (default: 5 minutes) */
    tokenLifetime?: number;
}
/**
 * Modal options for ActionResponse
 */
export interface ModalOptions {
    html: string;
    size?: string;
    spacing?: number;
}
/**
 * Drawer options for ActionResponse
 */
export interface DrawerOptions {
    html: string;
    position?: string;
    size?: string;
    spacing?: number;
}
/**
 * Response type for actions - can include HTML and/or script to execute
 */
export interface ActionResponse {
    /** HTML to render (optional) - single string or array of HTML strings for multi-target rendering */
    html?: string | string[];
    /** Named reactive state updates keyed by beam-id */
    state?: NamedStateUpdates;
    /** React island props updates keyed by beam-id */
    islands?: IslandPropsUpdates;
    /** React island upserts keyed by beam-id (create when missing, update when mounted) */
    islandUpserts?: IslandUpserts;
    /** beam-ids of islands to remove from the page */
    removeIslands?: string[];
    /** Named event to dispatch on the client ('beam:server-event') */
    event?: BeamServerEvent;
    /** Plain JSON payload for the caller — applied nowhere, returned to the call site */
    json?: unknown;
    /** Action failure details (dev builds carry message/stack; see beam:action-error) */
    error?: BeamActionError;
    /** JavaScript to execute on client (optional) */
    script?: string;
    /** URL to redirect to (optional) */
    redirect?: string;
    /** CSS selector for target element (optional - overrides frontend target). Can be comma-separated for array html: "#a, #b, #c" */
    target?: string;
    /** Swap mode: 'replace' | 'append' | 'prepend' | 'delete' (optional) */
    swap?: string;
    /** Open a modal with HTML content */
    modal?: string | ModalOptions;
    /** Open a drawer with HTML content */
    drawer?: string | DrawerOptions;
}
/**
 * Type for action handlers - receives context and data, returns ActionResponse.
 * Supports async generators for streaming multiple responses (e.g. skeleton → result).
 *
 * @example
 * ```ts
 * async function* loadData(ctx, data) {
 *   yield ctx.render(<Skeleton />)
 *   const result = await fetchData()
 *   yield ctx.render(<Results data={result} />)
 * }
 * ```
 */
export type ActionHandler<TEnv = object> = (ctx: BeamContext<TEnv>, data: Record<string, unknown>) => Promise<ActionResponse | string> | ActionResponse | string | AsyncGenerator<ActionResponse | string | Promise<ActionResponse | string>>;
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
export type SessionStorageFactory<TEnv = object> = (sessionId: string, env: TEnv) => BeamSession;
/**
 * Session configuration
 */
export interface SessionConfig<TEnv = object> {
    /** Secret key for signing session cookies (can be empty if secretEnvKey is provided) */
    secret: string;
    /** Environment variable name containing the secret (used at runtime) */
    secretEnvKey?: string;
    /** Cookie name (default: 'beam_sid') */
    cookieName?: string;
    /** Cookie max age in seconds (default: 1 year) */
    maxAge?: number;
    /** Custom storage factory (default: cookie storage) */
    storageFactory?: SessionStorageFactory<TEnv>;
}
/**
 * Configuration for createBeam
 */
export interface BeamConfig<TEnv = object> {
    actions: Record<string, ActionHandler<TEnv>>;
    auth?: AuthResolver<TEnv>;
    /** Session config - default uses cookie storage, or provide storageFactory for custom storage */
    session?: SessionConfig<TEnv>;
}
/**
 * Options for beam.init()
 */
export interface BeamInitOptions {
    /** WebSocket endpoint path (default: '/beam') */
    endpoint?: string;
    /** Optional internal Hono app used to run per-call Beam middleware on server-side RPC calls */
    rpcMiddlewareApp?: Hono<any>;
    /** Optional internal fetcher used by RPC callers to route action invocations through middleware */
    actionFetcher?: (request: Request, env: any) => Promise<Response>;
    /**
     * Options passed through to the capnweb RPC session (the WebSocket endpoint).
     * Use `limits` to tune receiver-side resource caps (message size, nesting
     * depth, bigint length — sane defaults always apply) and `onSendError` to
     * log or redact errors at the serialization layer.
     * @example beam.init(app, { rpcOptions: { limits: { maxMessageSize: 4 * 1024 * 1024 } } })
     */
    rpcOptions?: import('capnweb').RpcSessionOptions;
    /**
     * Origins allowed to open the WebSocket (defense-in-depth against
     * Cross-Site WebSocket Hijacking; the in-band token is the primary guard).
     * Default: same-origin only. Pass a list for split-origin setups, or '*'
     * to disable the check. A request with no Origin header is always allowed.
     */
    allowedOrigins?: string[] | '*';
    /**
     * Max size (bytes) of a multipart/Blob-carrying action body before it is
     * rejected with 413. Guards the in-memory upload buffer. @default 10485760 (10 MB)
     */
    maxUploadBytes?: number;
}
/**
 * Hono context variables set by beam.authMiddleware()
 * Use with: c.get('beam').user, c.get('beam').env, c.get('beam').request
 */
export interface BeamVariables<TEnv = object> {
    beam: BeamContext<TEnv>;
    /** Short-lived auth token for in-band WebSocket authentication */
    beamAuthToken: string;
    /** Internal per-request Beam resolution details used by streamed action routes */
    beamResolvedRequest?: BeamResolvedRequest<TEnv>;
}
/**
 * The Beam instance returned by createBeam
 */
export interface BeamInstance<TEnv extends object = object> {
    actions: Record<string, ActionHandler<TEnv>>;
    /** Auth resolver (if provided) */
    auth: AuthResolver<TEnv> | undefined;
    /** Init function for HonoX createApp({ init(app) { beam.init(app, options) } }) */
    init: <E extends HonoEnv>(app: Hono<E>, options?: BeamInitOptions) => void;
    /** Middleware that resolves auth and sets beamUser/beamContext in Hono context */
    authMiddleware: () => MiddlewareHandler<{
        Bindings: TEnv;
        Variables: BeamVariables<TEnv>;
    }>;
    /**
     * Generate a short-lived auth token for in-band WebSocket authentication.
     * This token should be embedded in the page and used by the client to authenticate.
     * @param ctx - The Beam context (from authMiddleware)
     * @returns A signed, short-lived token string
     */
    generateAuthToken: (ctx: BeamContext<TEnv>) => Promise<string>;
}
export {};
//# sourceMappingURL=types.d.ts.map