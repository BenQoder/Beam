import { RpcTarget } from 'capnweb';
import type { ActionHandler, ModalHandler, DrawerHandler, BeamConfig, BeamInstance, BeamContext, BeamSession } from './types';
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
export declare class KVSession implements BeamSession {
    private sessionId;
    private kv;
    constructor(sessionId: string, kv: KVNamespace);
    private key;
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
}
/**
 * Cookie-based session storage (default).
 * Stores all session data in a signed cookie (~4KB limit).
 * Good for: cart, preferences, small state.
 * For larger data, use KVSession or custom storage.
 */
export declare class CookieSession implements BeamSession {
    private data;
    private _dirty;
    constructor(initialData?: Record<string, unknown>);
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    /** Check if session data has been modified */
    isDirty(): boolean;
    /** Get all session data (for serializing to cookie) */
    getData(): Record<string, unknown>;
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
declare class BeamServer<TEnv extends object> extends RpcTarget {
    private ctx;
    private actions;
    private modals;
    private drawers;
    constructor(ctx: BeamContext<TEnv>, actions: Record<string, ActionHandler<TEnv>>, modals: Record<string, ModalHandler<TEnv>>, drawers: Record<string, DrawerHandler<TEnv>>);
    /**
     * Call an action handler
     */
    call(action: string, data?: Record<string, unknown>): Promise<string>;
    /**
     * Open a modal
     */
    modal(modalId: string, data?: Record<string, unknown>): Promise<string>;
    /**
     * Open a drawer
     */
    drawer(drawerId: string, data?: Record<string, unknown>): Promise<string>;
    /**
     * Register a client callback for server-initiated updates
     * This enables bidirectional communication - server can push to client
     */
    registerCallback(callback: (event: string, data: unknown) => void): void;
    /**
     * Notify connected client (if callback registered)
     */
    notify(event: string, data: unknown): Promise<void>;
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
export declare function createBeam<TEnv extends object = object>(config: BeamConfig<TEnv>): BeamInstance<TEnv>;
export { BeamServer };
//# sourceMappingURL=createBeam.d.ts.map