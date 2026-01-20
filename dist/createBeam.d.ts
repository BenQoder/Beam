import { RpcTarget } from 'capnweb';
import type { ActionHandler, ModalHandler, DrawerHandler, BeamConfig, BeamInstance } from './types';
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
    private actions;
    private modals;
    private drawers;
    private env;
    constructor(env: TEnv, actions: Record<string, ActionHandler<TEnv>>, modals: Record<string, ModalHandler<TEnv>>, drawers: Record<string, DrawerHandler<TEnv>>);
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