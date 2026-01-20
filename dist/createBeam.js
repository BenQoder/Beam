import { RpcTarget, newWorkersRpcResponse } from 'capnweb';
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
    actions;
    modals;
    drawers;
    env;
    constructor(env, actions, modals, drawers) {
        super();
        this.env = env;
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
        return await handler(this.env, data);
    }
    /**
     * Open a modal
     */
    async modal(modalId, data = {}) {
        const handler = this.modals[modalId];
        if (!handler) {
            throw new Error(`Unknown modal: ${modalId}`);
        }
        return await handler(this.env, data);
    }
    /**
     * Open a drawer
     */
    async drawer(drawerId, data = {}) {
        const handler = this.drawers[drawerId];
        if (!handler) {
            throw new Error(`Unknown drawer: ${drawerId}`);
        }
        return await handler(this.env, data);
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
    const { actions, modals, drawers = {} } = config;
    return {
        actions,
        modals,
        drawers,
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
            app.get(endpoint, (c) => {
                const upgradeHeader = c.req.header('Upgrade');
                if (upgradeHeader !== 'websocket') {
                    return c.text('Expected WebSocket', 426);
                }
                // Create BeamServer instance with capnweb RpcTarget
                const server = new BeamServer(c.env, actions, modals, drawers);
                // Use capnweb to handle the RPC connection
                return newWorkersRpcResponse(c.req.raw, server);
            });
        },
    };
}
// Export BeamServer for advanced usage (e.g., extending with custom methods)
export { BeamServer };
