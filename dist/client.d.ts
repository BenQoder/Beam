import { type RpcStub } from 'capnweb';
interface ActionResponse {
    html?: string | string[];
    state?: Record<string, unknown>;
    script?: string;
    redirect?: string;
    target?: string;
    swap?: string;
    modal?: string | {
        html: string;
        size?: string;
        spacing?: number;
    };
    drawer?: string | {
        html: string;
        position?: string;
        size?: string;
        spacing?: number;
    };
}
interface BeamServer {
    call(action: string, data?: Record<string, unknown>): ReadableStream<ActionResponse>;
    registerCallback(callback: (event: string, data: unknown) => void): Promise<void>;
}
type BeamServerStub = RpcStub<BeamServer>;
type HtmlApplyStyle = 'innerHTML' | 'outerHTML';
declare function applyHtml(target: Element, html: string, options?: {
    keepElements?: string[];
    style?: HtmlApplyStyle;
}): void;
declare function swap(target: Element, html: string, mode: string, trigger?: HTMLElement): void;
/**
 * Handle HTML response - supports both single string and array of HTML strings.
 * Target resolution order (server wins, frontend is fallback):
 * 1. Server target from comma-separated list (by index)
 *    - Use "!selector" to exclude that selector (blocks frontend fallback too)
 * 2. Frontend target (beam-target) as fallback for remaining items
 * 3. ID from HTML fragment's root element
 * 4. Skip if none found
 */
declare function handleHtmlResponse(response: ActionResponse, frontendTarget: string | null, frontendSwap: string, trigger?: HTMLElement): void;
declare function parseOobSwaps(html: string): {
    main: string;
    oob: Array<{
        selector: string;
        content: string;
        swapMode: string;
    }>;
};
declare function applyStateResponse(stateUpdates: Record<string, unknown>): void;
/**
 * Apply a single ActionResponse chunk to the DOM.
 * Returns true if the response was a redirect (caller should stop processing).
 */
declare function applyResponse(response: ActionResponse, frontendTarget: string | null, frontendSwap: string, trigger?: HTMLElement): boolean;
declare function handleHistory(el: HTMLElement): void;
declare function openModal(html: string, size?: string, spacing?: number): void;
declare function closeModal(): void;
declare function openDrawer(html: string, position?: string, size?: string, spacing?: number): void;
declare function closeDrawer(): void;
declare function showToast(message: string, type?: 'success' | 'error'): void;
declare function setupSwitch(el: HTMLElement): void;
declare function setupAutosubmit(form: HTMLFormElement): void;
declare function getScrollStateKey(action: string): string;
declare function saveScrollState(targetSelector: string, action: string): void;
declare function restoreScrollState(): boolean;
declare function clearCache(action?: string): void;
declare function setupValidation(el: HTMLElement): void;
declare function castValue(value: unknown, castType: string | null): unknown;
declare function checkWatchCondition(el: HTMLElement, value: unknown): boolean;
declare function createThrottle(fn: () => void, limit: number): () => void;
declare function setupInputWatcher(el: Element): void;
declare function startPolling(el: HTMLElement): void;
declare function stopPolling(el: HTMLElement): void;
declare function processHungryElements(html: string): void;
declare function isFormDirty(form: HTMLFormElement): boolean;
declare function setupDirtyTracking(form: HTMLFormElement): void;
interface CallOptions {
    target?: string;
    swap?: string;
}
declare function clearScrollState(actionOrAll?: string | boolean): void;
declare function checkWsConnected(): boolean;
declare function manualReconnect(): Promise<BeamServerStub>;
declare const beamUtils: {
    getState: (elOrId: Element | string) => object | undefined;
    batch: (fn: () => void) => void;
    updateState: (id: string, value: unknown) => boolean;
    init: () => void;
    scan: (root?: ParentNode) => void;
    showToast: typeof showToast;
    closeModal: typeof closeModal;
    closeDrawer: typeof closeDrawer;
    clearCache: typeof clearCache;
    clearScrollState: typeof clearScrollState;
    isOnline: () => boolean;
    isConnected: typeof checkWsConnected;
    reconnect: typeof manualReconnect;
    getSession: () => Promise<BeamServerStub>;
};
export declare const __beamClientInternals: {
    api: {
        call(action: string, data?: Record<string, unknown>): Promise<ReadableStream<ActionResponse>>;
        getSession(): Promise<BeamServerStub>;
    };
    applyHtml: typeof applyHtml;
    swap: typeof swap;
    handleHtmlResponse: typeof handleHtmlResponse;
    parseOobSwaps: typeof parseOobSwaps;
    applyStateResponse: typeof applyStateResponse;
    applyResponse: typeof applyResponse;
    handleHistory: typeof handleHistory;
    openModal: typeof openModal;
    closeModal: typeof closeModal;
    openDrawer: typeof openDrawer;
    closeDrawer: typeof closeDrawer;
    setupSwitch: typeof setupSwitch;
    setupAutosubmit: typeof setupAutosubmit;
    getScrollStateKey: typeof getScrollStateKey;
    saveScrollState: typeof saveScrollState;
    restoreScrollState: typeof restoreScrollState;
    clearCache: typeof clearCache;
    processHungryElements: typeof processHungryElements;
    castValue: typeof castValue;
    checkWatchCondition: typeof checkWatchCondition;
    createThrottle: typeof createThrottle;
    setupInputWatcher: typeof setupInputWatcher;
    startPolling: typeof startPolling;
    stopPolling: typeof stopPolling;
    setupValidation: typeof setupValidation;
    setupDirtyTracking: typeof setupDirtyTracking;
    isFormDirty: typeof isFormDirty;
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