import type { Hono } from 'hono';
/**
 * Type for action handlers - receives env and data, returns HTML string
 */
export type ActionHandler<TEnv = object> = (env: TEnv, data: Record<string, unknown>) => Promise<string>;
/**
 * Type for modal handlers - receives env and params, returns HTML string
 */
export type ModalHandler<TEnv = object> = (env: TEnv, params: Record<string, unknown>) => Promise<string>;
/**
 * Type for drawer handlers - receives env and params, returns HTML string
 */
export type DrawerHandler<TEnv = object> = (env: TEnv, params: Record<string, unknown>) => Promise<string>;
/**
 * Configuration for createBeam
 */
export interface BeamConfig<TEnv = object> {
    actions: Record<string, ActionHandler<TEnv>>;
    modals: Record<string, ModalHandler<TEnv>>;
    drawers?: Record<string, DrawerHandler<TEnv>>;
}
/**
 * Options for beam.init()
 */
export interface BeamInitOptions {
    /** WebSocket endpoint path (default: '/beam') */
    endpoint?: string;
}
/**
 * The Beam instance returned by createBeam
 */
export interface BeamInstance<TEnv extends object = object> {
    actions: Record<string, ActionHandler<TEnv>>;
    modals: Record<string, ModalHandler<TEnv>>;
    drawers: Record<string, DrawerHandler<TEnv>>;
    /** Init function for HonoX createApp({ init(app) { beam.init(app, options) } }) */
    init: (app: Hono<{
        Bindings: TEnv;
    }>, options?: BeamInitOptions) => void;
}
//# sourceMappingURL=types.d.ts.map