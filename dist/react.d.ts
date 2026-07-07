import type { ActionResponse } from './types';
export interface BeamCallOptions {
    /** CSS selector applied to html responses (same as beam-target) */
    target?: string;
    /** Swap mode for html responses: 'replace' | 'append' | 'prepend' | 'delete' */
    swap?: string;
}
/**
 * Call a Beam action over the WebSocket RPC from anywhere in JS/React.
 * Responses are applied like any Beam response (html swaps, state, islands,
 * events, modals, ...) and the final ActionResponse is returned.
 */
export declare function callBeamAction(action: string, data?: Record<string, unknown>, options?: BeamCallOptions): Promise<ActionResponse>;
export interface UseBeamActionResult<TJson = unknown> {
    /** Invoke the action with optional params. Resolves with the final ActionResponse. */
    call: (data?: Record<string, unknown>) => Promise<ActionResponse>;
    /** True while a call from this hook is in flight */
    loading: boolean;
    /** Error from the most recent call, if any */
    error: Error | null;
    /** Final ActionResponse from the most recent successful call */
    data: ActionResponse | null;
    /** ctx.json(value) payload from the most recent successful call, if any */
    json: TJson | null;
}
/**
 * React hook to call a Beam action at any time.
 *
 * Streaming actions (async generators) work transparently: every chunk is
 * applied as it arrives and `call` resolves with the last one.
 *
 * Actions returning `ctx.json(value)` deliver plain data — read it from the
 * resolved response or the `json` field:
 *
 * @example
 * const { call: addToCart, loading } = useBeamAction('addToCart')
 * <button disabled={loading} onClick={() => addToCart({ id })}>Add</button>
 *
 * @example
 * const { call: search, json: results } = useBeamAction<Product[]>('searchProducts')
 * // or imperatively: const results = (await search({ q })).json as Product[]
 */
export declare function useBeamAction<TJson = unknown>(action: string, options?: BeamCallOptions): UseBeamActionResult<TJson>;
/**
 * React hook binding a Beam named reactive state (beam-id) into React.
 *
 * Returns the live state proxy: mutate it directly and both worlds update —
 * React re-renders AND every beam-text/beam-show/beam-class binding on the
 * page. Server `ctx.state('cart', {...})` updates re-render this hook too.
 *
 * Creates the named state if it does not exist yet (declare the keys you need
 * in `initial` — updates to undeclared keys added later are not tracked until
 * a declared key changes).
 *
 * @example
 * const cart = useBeamState('cart', { count: 0 })
 * <button onClick={() => { cart.count++ }}>{cart.count}</button>
 */
export declare function useBeamState<T extends object = Record<string, unknown>>(id: string, initial?: T): T;
/**
 * React hook subscribing to server-pushed Beam events — from `ctx.event(name, data)`
 * response chunks (including streamed ones) or fire-and-forget `ctx.notify(name, data)`.
 *
 * @example
 * useBeamEvent<{ message: string }>('order:shipped', (data) => setBanner(data.message))
 */
export declare function useBeamEvent<T = unknown>(name: string, handler: (data: T) => void): void;
interface BeamConnectionState {
    connected: boolean;
    online: boolean;
}
/**
 * React hook exposing Beam's WebSocket connection status.
 *
 * @example
 * const { connected } = useBeamConnection()
 * {!connected && <span>Reconnecting…</span>}
 */
export declare function useBeamConnection(): BeamConnectionState;
export {};
//# sourceMappingURL=react.d.ts.map