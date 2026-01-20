import { type RpcStub } from 'capnweb';
interface BeamServer {
    call(action: string, data?: Record<string, unknown>): Promise<string>;
    modal(modalId: string, data?: Record<string, unknown>): Promise<string>;
    drawer(drawerId: string, data?: Record<string, unknown>): Promise<string>;
    registerCallback(callback: (event: string, data: unknown) => void): Promise<void>;
}
type BeamServerStub = RpcStub<BeamServer>;
declare const api: {
    call(action: string, data?: Record<string, unknown>): Promise<string>;
    modal(modalId: string, params?: Record<string, unknown>): Promise<string>;
    drawer(drawerId: string, params?: Record<string, unknown>): Promise<string>;
    getSession(): Promise<BeamServerStub>;
};
declare function closeModal(): void;
declare function closeDrawer(): void;
declare function showToast(message: string, type?: 'success' | 'error'): void;
declare function clearCache(action?: string): void;
declare global {
    interface Window {
        beam: {
            showToast: typeof showToast;
            closeModal: typeof closeModal;
            closeDrawer: typeof closeDrawer;
            clearCache: typeof clearCache;
            isOnline: () => boolean;
            getSession: typeof api.getSession;
        };
    }
}
export {};
//# sourceMappingURL=client.d.ts.map