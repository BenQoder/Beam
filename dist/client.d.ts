import { type RpcStub } from 'capnweb';
interface ActionResponse {
    html?: string;
    script?: string;
    redirect?: string;
    target?: string;
    swap?: string;
}
interface BeamServer {
    call(action: string, data?: Record<string, unknown>): Promise<ActionResponse>;
    modal(modalId: string, data?: Record<string, unknown>): Promise<string>;
    drawer(drawerId: string, data?: Record<string, unknown>): Promise<string>;
    registerCallback(callback: (event: string, data: unknown) => void): Promise<void>;
}
type BeamServerStub = RpcStub<BeamServer>;
declare function closeModal(): void;
declare function closeDrawer(): void;
declare function showToast(message: string, type?: 'success' | 'error'): void;
declare function clearCache(action?: string): void;
interface CallOptions {
    target?: string;
    swap?: string;
}
declare function clearScrollState(actionOrAll?: string | boolean): void;
declare const beamUtils: {
    showToast: typeof showToast;
    closeModal: typeof closeModal;
    closeDrawer: typeof closeDrawer;
    clearCache: typeof clearCache;
    clearScrollState: typeof clearScrollState;
    isOnline: () => boolean;
    getSession: () => Promise<BeamServerStub>;
};
type ActionCaller = (data?: Record<string, unknown>, options?: string | CallOptions) => Promise<ActionResponse>;
declare global {
    interface Window {
        beam: typeof beamUtils & {
            [action: string]: ActionCaller;
        };
    }
}
export {};
//# sourceMappingURL=client.d.ts.map