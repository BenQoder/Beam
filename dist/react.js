// ============ BEAM REACT HOOKS ============
// React-side APIs for island components, riding Beam's duplex WebSocket:
//
// - Client → server at any time: useBeamAction(name) / callBeamAction()
// - Server → client at any time: props via ctx.island(id, props) (handled by
//   the runtime in '@benqoder/beam/islands'), shared state via ctx.state(id, v)
//   (useBeamState), events via ctx.event()/ctx.notify() (useBeamEvent)
//
// Import this module ONLY from island components so React stays out of the
// main client bundle. The client entry registers islands via
// '@benqoder/beam/islands', which loads React lazily on first mount.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { beamReactivity } from './reactivity';
// ============ ACTION CALLS (client → server, any time) ============
function beamGlobal() {
    const beam = window.beam;
    if (!beam) {
        throw new Error('[beam] Beam client is not loaded. Import "@benqoder/beam/client" before calling actions from React.');
    }
    return beam;
}
/**
 * Call a Beam action over the WebSocket RPC from anywhere in JS/React.
 * Responses are applied like any Beam response (html swaps, state, islands,
 * events, modals, ...) and the final ActionResponse is returned.
 */
export function callBeamAction(action, data = {}, options) {
    return beamGlobal()[action](data, options);
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
export function useBeamAction(action, options) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    const call = useCallback(async (params = {}) => {
        if (mountedRef.current) {
            setLoading(true);
            setError(null);
        }
        try {
            const response = await callBeamAction(action, params, optionsRef.current);
            if (mountedRef.current)
                setData(response);
            return response;
        }
        catch (err) {
            const normalized = err instanceof Error ? err : new Error(String(err));
            if (mountedRef.current)
                setError(normalized);
            throw normalized;
        }
        finally {
            if (mountedRef.current)
                setLoading(false);
        }
    }, [action]);
    return { call, loading, error, data, json: data?.json ?? null };
}
// ============ SHARED STATE (server ⇄ attribute-world ⇄ React) ============
// Touch every reachable property so the surrounding reactive effect subscribes
// to the whole named state (matches how updateNamedState shallow-merges).
function touchDeep(value, seen = new Set()) {
    if (!value || typeof value !== 'object')
        return;
    const obj = value;
    if (seen.has(obj))
        return;
    seen.add(obj);
    if (Array.isArray(obj)) {
        obj.forEach((item) => touchDeep(item, seen));
        return;
    }
    Object.values(obj).forEach((item) => touchDeep(item, seen));
}
const stateSubscriptions = new Map();
// One page-lifetime watcher per state id. Created synchronously on first use
// so the version is already tracking when React subscribes — updates landing
// between a component's render and its subscription are caught by React's
// subscribe-time snapshot recheck instead of being lost.
function ensureStateSubscription(id) {
    let sub = stateSubscriptions.get(id);
    if (!sub) {
        const created = { version: 0, listeners: new Set() };
        sub = created;
        stateSubscriptions.set(id, created);
        let first = true;
        beamReactivity.effect(() => {
            touchDeep(beamReactivity.getState(id));
            if (first) {
                first = false;
                return;
            }
            created.version++;
            // Notify outside the reactive tracking context so component renders
            // triggered by React don't get tracked into this watcher.
            queueMicrotask(() => created.listeners.forEach((listener) => listener()));
        });
    }
    return sub;
}
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
export function useBeamState(id, initial) {
    const initialRef = useRef(initial);
    const state = beamReactivity.ensureState(id, initialRef.current);
    ensureStateSubscription(id);
    const subscribe = useCallback((onStoreChange) => {
        const sub = ensureStateSubscription(id);
        sub.listeners.add(onStoreChange);
        return () => {
            sub.listeners.delete(onStoreChange);
        };
    }, [id]);
    const getSnapshot = useCallback(() => ensureStateSubscription(id).version, [id]);
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return state;
}
/**
 * React hook subscribing to server-pushed Beam events — from `ctx.event(name, data)`
 * response chunks (including streamed ones) or fire-and-forget `ctx.notify(name, data)`.
 *
 * @example
 * useBeamEvent<{ message: string }>('order:shipped', (data) => setBanner(data.message))
 */
export function useBeamEvent(name, handler) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;
    useEffect(() => {
        const listener = (e) => {
            const detail = e.detail;
            if (detail?.event === name)
                handlerRef.current(detail.data);
        };
        window.addEventListener('beam:server-event', listener);
        return () => window.removeEventListener('beam:server-event', listener);
    }, [name]);
}
let connectionSnapshot = { connected: false, online: true };
function readConnectionSnapshot() {
    const beam = window.beam;
    const connected = Boolean(beam?.isConnected?.());
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (connected !== connectionSnapshot.connected || online !== connectionSnapshot.online) {
        connectionSnapshot = { connected, online };
    }
    return connectionSnapshot;
}
function subscribeConnection(onStoreChange) {
    const events = ['beam:connected', 'beam:disconnected', 'beam:reconnected', 'online', 'offline'];
    const handler = () => onStoreChange();
    events.forEach((event) => window.addEventListener(event, handler));
    return () => events.forEach((event) => window.removeEventListener(event, handler));
}
/**
 * React hook exposing Beam's WebSocket connection status.
 *
 * @example
 * const { connected } = useBeamConnection()
 * {!connected && <span>Reconnecting…</span>}
 */
export function useBeamConnection() {
    return useSyncExternalStore(subscribeConnection, readConnectionSnapshot, readConnectionSnapshot);
}
