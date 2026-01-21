import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import { RpcTarget, newWorkersRpcResponse } from 'capnweb';
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
export class KVSession {
    sessionId;
    kv;
    constructor(sessionId, kv) {
        this.sessionId = sessionId;
        this.kv = kv;
    }
    key(k) {
        return `beam:${this.sessionId}:${k}`;
    }
    async get(key) {
        const data = await this.kv.get(this.key(key));
        if (!data)
            return null;
        return JSON.parse(data);
    }
    async set(key, value) {
        await this.kv.put(this.key(key), JSON.stringify(value));
    }
    async delete(key) {
        await this.kv.delete(this.key(key));
    }
}
/**
 * Cookie-based session storage (default).
 * Stores all session data in a signed cookie (~4KB limit).
 * Good for: cart, preferences, small state.
 * For larger data, use KVSession or custom storage.
 */
export class CookieSession {
    data;
    _dirty = false;
    constructor(initialData = {}) {
        this.data = initialData;
    }
    async get(key) {
        return this.data[key] ?? null;
    }
    async set(key, value) {
        this.data[key] = value;
        this._dirty = true;
    }
    async delete(key) {
        delete this.data[key];
        this._dirty = true;
    }
    /** Check if session data has been modified */
    isDirty() {
        return this._dirty;
    }
    /** Get all session data (for serializing to cookie) */
    getData() {
        return this.data;
    }
}
/** Cookie name for session data (separate from session ID) */
const SESSION_DATA_COOKIE = 'beam_data';
/**
 * Parse cookies from raw request (for WebSocket context)
 */
function parseCookies(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader)
        return {};
    return Object.fromEntries(cookieHeader.split(';').map((c) => {
        const [key, ...val] = c.trim().split('=');
        return [key, val.join('=')];
    }));
}
/**
 * Parse session ID from raw request cookies (for WebSocket context)
 */
function parseSessionFromRequest(request, cookieName) {
    const cookies = parseCookies(request);
    const signedValue = cookies[cookieName];
    if (!signedValue)
        return null;
    // Hono signed cookie format: value.signature
    const parts = signedValue.split('.');
    if (parts.length !== 2)
        return null;
    return parts[0] || null;
}
/**
 * Parse session data from raw request cookies (for WebSocket context)
 */
function parseSessionDataFromRequest(request) {
    const cookies = parseCookies(request);
    const signedValue = cookies[SESSION_DATA_COOKIE];
    if (!signedValue)
        return {};
    // Hono signed cookie format: value.signature
    const parts = signedValue.split('.');
    if (parts.length !== 2)
        return {};
    try {
        return JSON.parse(decodeURIComponent(parts[0]));
    }
    catch {
        return {};
    }
}
/**
 * Create a BeamContext with script() and render() helpers
 */
function createBeamContext(base) {
    return {
        ...base,
        script: (code) => ({ script: code }),
        render: (html, options) => {
            if (html instanceof Promise) {
                return html.then((resolved) => ({ html: resolved, script: options?.script }));
            }
            return { html, script: options?.script };
        },
        redirect: (url) => ({ redirect: url }),
    };
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
class BeamServer extends RpcTarget {
    ctx;
    actions;
    modals;
    drawers;
    constructor(ctx, actions, modals, drawers) {
        super();
        this.ctx = ctx;
        this.actions = actions;
        this.modals = modals;
        this.drawers = drawers;
    }
    /**
     * Call an action handler
     */
    async call(action, data = {}) {
        const handler = this.actions[action];
        if (!handler) {
            throw new Error(`Unknown action: ${action}`);
        }
        const result = await handler(this.ctx, data);
        // Normalize string responses to ActionResponse format
        if (typeof result === 'string') {
            return { html: result };
        }
        return result;
    }
    /**
     * Open a modal
     */
    async modal(modalId, data = {}) {
        const handler = this.modals[modalId];
        if (!handler) {
            throw new Error(`Unknown modal: ${modalId}`);
        }
        return await handler(this.ctx, data);
    }
    /**
     * Open a drawer
     */
    async drawer(drawerId, data = {}) {
        const handler = this.drawers[drawerId];
        if (!handler) {
            throw new Error(`Unknown drawer: ${drawerId}`);
        }
        return await handler(this.ctx, data);
    }
    /**
     * Register a client callback for server-initiated updates
     * This enables bidirectional communication - server can push to client
     */
    registerCallback(callback) {
        // Store callback for later use by actions that need to push updates
        ;
        this._clientCallback = callback;
    }
    /**
     * Notify connected client (if callback registered)
     */
    async notify(event, data) {
        const callback = this._clientCallback;
        if (callback) {
            await callback(event, data);
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
export function createBeam(config) {
    const { actions, modals, drawers = {}, auth, session: sessionConfig } = config;
    // Session defaults
    const cookieName = sessionConfig?.cookieName ?? 'beam_sid';
    const maxAge = sessionConfig?.maxAge ?? 365 * 24 * 60 * 60; // 1 year
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
        authMiddleware() {
            return async (c, next) => {
                // Resolve auth if resolver provided
                const user = auth ? await auth(c.req.raw, c.env) : null;
                // Resolve session
                let sessionId = null;
                let session;
                let cookieSession = null;
                if (sessionConfig) {
                    // Resolve secret from env if secretEnvKey provided, otherwise use static secret
                    const secret = sessionConfig.secretEnvKey
                        ? c.env[sessionConfig.secretEnvKey]
                        : sessionConfig.secret;
                    if (!secret) {
                        throw new Error(sessionConfig.secretEnvKey
                            ? `Session secret not found in env.${sessionConfig.secretEnvKey}`
                            : 'Session secret is required');
                    }
                    // Get or create session ID
                    const cookieValue = await getSignedCookie(c, secret, cookieName);
                    sessionId = typeof cookieValue === 'string' ? cookieValue : null;
                    if (!sessionId) {
                        sessionId = crypto.randomUUID();
                        await setSignedCookie(c, cookieName, sessionId, secret, {
                            maxAge,
                            httpOnly: true,
                            sameSite: 'Lax',
                            path: '/',
                        });
                    }
                    // Use custom storage factory if provided, otherwise use cookie storage
                    if (sessionConfig.storageFactory) {
                        session = sessionConfig.storageFactory(sessionId, c.env);
                    }
                    else {
                        // Default: cookie-based session storage
                        const existingDataCookie = await getSignedCookie(c, secret, SESSION_DATA_COOKIE);
                        let existingData = {};
                        if (typeof existingDataCookie === 'string') {
                            try {
                                existingData = JSON.parse(existingDataCookie);
                            }
                            catch {
                                existingData = {};
                            }
                        }
                        cookieSession = new CookieSession(existingData);
                        session = cookieSession;
                    }
                }
                else {
                    // No session config - provide a noop session
                    session = {
                        get: async () => null,
                        set: async () => { },
                        delete: async () => { },
                    };
                }
                // Create context with script() and render() helpers
                const ctx = createBeamContext({
                    env: c.env,
                    user,
                    request: c.req.raw,
                    session,
                });
                // Set in Hono context for use by routes
                c.set('beam', ctx);
                await next();
                // If using cookie session and data was modified, save it back to cookie
                if (cookieSession && cookieSession.isDirty() && sessionConfig) {
                    const secret = sessionConfig.secretEnvKey
                        ? c.env[sessionConfig.secretEnvKey]
                        : sessionConfig.secret;
                    const dataString = JSON.stringify(cookieSession.getData());
                    await setSignedCookie(c, SESSION_DATA_COOKIE, dataString, secret, {
                        maxAge,
                        httpOnly: true,
                        sameSite: 'Lax',
                        path: '/',
                    });
                }
            };
        },
        /**
         * Init function for HonoX createApp().
         * Registers the WebSocket RPC endpoint using capnweb.
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
        init(app, options) {
            const endpoint = options?.endpoint ?? '/beam';
            app.get(endpoint, async (c) => {
                const upgradeHeader = c.req.header('Upgrade');
                if (upgradeHeader !== 'websocket') {
                    return c.text('Expected WebSocket', 426);
                }
                // Try to get context from middleware, otherwise resolve fresh
                let ctx;
                const existingCtx = c.var.beam;
                if (existingCtx) {
                    ctx = existingCtx;
                }
                else {
                    // Resolve auth
                    const user = auth ? await auth(c.req.raw, c.env) : null;
                    // Resolve session for WebSocket (cookie storage is read-only in WebSocket context)
                    let session;
                    if (sessionConfig) {
                        const sessionId = parseSessionFromRequest(c.req.raw, cookieName);
                        if (sessionId) {
                            // Use custom storage factory if provided
                            if (sessionConfig.storageFactory) {
                                session = sessionConfig.storageFactory(sessionId, c.env);
                            }
                            else {
                                // Default: cookie-based session (read-only - can't set cookies in WebSocket)
                                const existingData = parseSessionDataFromRequest(c.req.raw);
                                session = new CookieSession(existingData);
                            }
                        }
                        else {
                            // No session cookie - provide noop (rare edge case)
                            session = {
                                get: async () => null,
                                set: async () => { },
                                delete: async () => { },
                            };
                        }
                    }
                    else {
                        session = {
                            get: async () => null,
                            set: async () => { },
                            delete: async () => { },
                        };
                    }
                    ctx = createBeamContext({
                        env: c.env,
                        user,
                        request: c.req.raw,
                        session,
                    });
                }
                // Create BeamServer instance with capnweb RpcTarget
                const server = new BeamServer(ctx, actions, modals, drawers);
                // Use capnweb to handle the RPC connection
                return newWorkersRpcResponse(c.req.raw, server);
            });
        },
    };
}
// Export BeamServer for advanced usage (e.g., extending with custom methods)
export { BeamServer };
