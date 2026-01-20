import { Hono } from 'hono'
import { RpcTarget, newWorkersRpcResponse } from 'capnweb'
import type { ActionHandler, ModalHandler, DrawerHandler, BeamConfig, BeamInstance } from './types'

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
  private actions: Record<string, ActionHandler<TEnv>>
  private modals: Record<string, ModalHandler<TEnv>>
  private drawers: Record<string, DrawerHandler<TEnv>>
  private env: TEnv

  constructor(
    env: TEnv,
    actions: Record<string, ActionHandler<TEnv>>,
    modals: Record<string, ModalHandler<TEnv>>,
    drawers: Record<string, DrawerHandler<TEnv>>
  ) {
    super()
    this.env = env
    this.actions = actions
    this.modals = modals
    this.drawers = drawers
  }

  /**
   * Call an action handler
   */
  async call(action: string, data: Record<string, unknown> = {}): Promise<string> {
    const handler = this.actions[action]
    if (!handler) {
      throw new Error(`Unknown action: ${action}`)
    }
    return await handler(this.env, data)
  }

  /**
   * Open a modal
   */
  async modal(modalId: string, data: Record<string, unknown> = {}): Promise<string> {
    const handler = this.modals[modalId]
    if (!handler) {
      throw new Error(`Unknown modal: ${modalId}`)
    }
    return await handler(this.env, data)
  }

  /**
   * Open a drawer
   */
  async drawer(drawerId: string, data: Record<string, unknown> = {}): Promise<string> {
    const handler = this.drawers[drawerId]
    if (!handler) {
      throw new Error(`Unknown drawer: ${drawerId}`)
    }
    return await handler(this.env, data)
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
  const { actions, modals, drawers = {} } = config

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
    init(app: Hono<{ Bindings: TEnv }>, options?: { endpoint?: string }) {
      const endpoint = options?.endpoint ?? '/beam'

      app.get(endpoint, (c) => {
        const upgradeHeader = c.req.header('Upgrade')
        if (upgradeHeader !== 'websocket') {
          return c.text('Expected WebSocket', 426)
        }

        // Create BeamServer instance with capnweb RpcTarget
        const server = new BeamServer(
          c.env,
          actions as Record<string, ActionHandler<TEnv>>,
          modals as Record<string, ModalHandler<TEnv>>,
          drawers as Record<string, DrawerHandler<TEnv>>
        )

        // Use capnweb to handle the RPC connection
        return newWorkersRpcResponse(c.req.raw, server)
      })
    },
  }
}

// Export BeamServer for advanced usage (e.g., extending with custom methods)
export { BeamServer }
