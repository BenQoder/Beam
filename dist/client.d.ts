import { type RpcStub } from 'capnweb';
import type { BeamActionJson, BeamActionParams, RegisteredActionName } from './types';
interface IslandUpsertSpec {
    props?: Record<string, unknown>;
    component?: string;
    src?: string;
    target?: string;
    swap?: 'append' | 'prepend' | 'replace';
    load?: 'eager' | 'visible' | 'idle';
}
interface ActionResponse {
    html?: string | string[];
    state?: Record<string, unknown>;
    islands?: Record<string, Record<string, unknown>>;
    islandUpserts?: Record<string, IslandUpsertSpec>;
    removeIslands?: string[];
    event?: {
        name: string;
        data?: unknown;
    };
    json?: unknown;
    error?: {
        action?: string;
        message: string;
        stack?: string;
    };
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
type VisitMode = 'visit' | 'patch' | 'navigate';
interface VisitOptions {
    mode?: VisitMode;
    target?: string;
    replace?: boolean;
}
interface VisitResponse {
    url: string;
    finalUrl: string;
    status: number;
    mode: VisitMode;
    target?: string;
    replace?: boolean;
    redirect?: string;
    reload?: boolean;
    reason?: string;
    title?: string;
    headHtml?: string;
    documentHtml?: string;
    assetSignature?: string;
    scroll?: 'preserve' | 'reset';
}
interface BeamServer {
    call(action: string, data?: Record<string, unknown>): ReadableStream<ActionResponse>;
    visit(url: string, options?: VisitOptions): Promise<VisitResponse>;
    registerCallback(callback: (event: string, data: unknown) => void): Promise<void>;
}
type BeamServerStub = RpcStub<BeamServer>;
declare function shouldAutoConnect(): boolean;
declare function canReconnect(): boolean;
type HtmlApplyStyle = 'innerHTML' | 'outerHTML';
declare function applyHtml(target: Element, html: string, options?: {
    keepElements?: string[];
    style?: HtmlApplyStyle;
}): void;
declare function updateLoadingIndicators(): void;
/** beam-transition-name="x" → style view-transition-name (shared-element morphs) */
declare function applyTransitionNames(root: Document | Element): void;
declare function withViewTransition(target: Element, mutate: () => void): void;
/**
 * Run enter transitions on newly inserted content. Elements carrying
 * beam-enter classes get: enter+start applied pre-paint → start swapped for
 * end on the next frame → all classes removed when the transition settles.
 * A parent's beam-enter-stagger="80" spaces its children by 80ms each.
 */
declare function runEnterTransitions(root: Element): void;
/**
 * Run leave transitions before an element is removed (beam-swap="delete",
 * ctx.removeIsland, ...). Resolves when the animation settles — or
 * immediately when the element has no beam-leave classes or reduced motion
 * is preferred.
 */
declare function runLeaveTransition(el: Element): Promise<void>;
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
/** Toggle beam call tracing (persisted). Call from the console: beam.debug(true) */
declare function setDebug(on?: boolean): boolean;
declare function summarizeResponse(response: ActionResponse): string;
interface ActionTrace {
    chunk(response: ActionResponse): void;
    done(error?: unknown): void;
}
declare function traceAction(action: string, params: Record<string, unknown>): ActionTrace;
/**
 * Surface an action failure: console + 'beam:action-error' window event
 * (rendered by the dev overlay in dev builds, loggable anywhere).
 */
declare function handleActionError(error: {
    action?: string;
    message: string;
    stack?: string;
}): void;
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
type RuntimeHeadAsset = {
    kind: 'script' | 'link';
    url: string;
    rel?: string;
    as?: string | null;
    type?: string | null;
    crossorigin?: string | null;
    integrity?: string | null;
    referrerpolicy?: string | null;
    nonce?: string | null;
    media?: string | null;
};
type RuntimeHeadQueryRoot = Pick<Document | Element, 'querySelectorAll'>;
declare function getVisitMode(link: HTMLAnchorElement): VisitMode;
declare function getVisitTargetSelector(link: HTMLAnchorElement): string;
declare function extractRuntimeHeadAssets(root: RuntimeHeadQueryRoot): RuntimeHeadAsset[];
declare function getCurrentAssetSignature(): string;
declare function ensureVisitAssets(doc: Document): Promise<void>;
declare function applyVisitResponse(response: VisitResponse, targetSelector: string): Promise<'applied' | 'hard-navigate'>;
declare function prefetchVisit(link: HTMLAnchorElement): Promise<void>;
declare function performVisit(url: string, options: {
    mode: VisitMode;
    target: string;
    replace: boolean;
    preview?: boolean;
}): Promise<void>;
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
declare function manualVisit(url: string, options?: VisitOptions): Promise<void>;
declare const beamUtils: {
    getState: (elOrId: Element | string) => object | undefined;
    batch: (fn: () => void) => void;
    updateState: (id: string, value: unknown) => boolean;
    ensureState: (id: string, initial?: Record<string, unknown>) => object;
    effect: (fn: () => void) => (() => void);
    init: () => void;
    scan: (root?: ParentNode) => void;
    showToast: typeof showToast;
    closeModal: typeof closeModal;
    closeDrawer: typeof closeDrawer;
    clearCache: typeof clearCache;
    debug: typeof setDebug;
    clearScrollState: typeof clearScrollState;
    isOnline: () => boolean;
    isConnected: typeof checkWsConnected;
    reconnect: typeof manualReconnect;
    visit: typeof manualVisit;
    getSession: () => Promise<BeamServerStub>;
};
export declare const __beamClientInternals: {
    api: {
        call(action: string, data?: Record<string, unknown>): Promise<ReadableStream<ActionResponse>>;
        visit(url: string, options?: VisitOptions): Promise<VisitResponse>;
        getSession(): Promise<BeamServerStub>;
    };
    shouldAutoConnect: typeof shouldAutoConnect;
    canReconnect: typeof canReconnect;
    getCurrentAssetSignature: typeof getCurrentAssetSignature;
    extractRuntimeHeadAssets: typeof extractRuntimeHeadAssets;
    ensureVisitAssets: typeof ensureVisitAssets;
    getVisitMode: typeof getVisitMode;
    getVisitTargetSelector: typeof getVisitTargetSelector;
    applyVisitResponse: typeof applyVisitResponse;
    performVisit: typeof performVisit;
    prefetchVisit: typeof prefetchVisit;
    applyHtml: typeof applyHtml;
    swap: typeof swap;
    handleHtmlResponse: typeof handleHtmlResponse;
    parseOobSwaps: typeof parseOobSwaps;
    applyStateResponse: typeof applyStateResponse;
    applyResponse: typeof applyResponse;
    handleActionError: typeof handleActionError;
    summarizeResponse: typeof summarizeResponse;
    traceAction: typeof traceAction;
    setDebug: typeof setDebug;
    applyTransitionNames: typeof applyTransitionNames;
    runEnterTransitions: typeof runEnterTransitions;
    runLeaveTransition: typeof runLeaveTransition;
    withViewTransition: typeof withViewTransition;
    updateLoadingIndicators: typeof updateLoadingIndicators;
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
type TypedActionCallers = {
    [N in RegisteredActionName]: (data?: BeamActionParams<N>, options?: string | CallOptions) => Promise<ActionResponse & {
        json?: BeamActionJson<N>;
    }>;
};
declare global {
    interface Window {
        beam: typeof beamUtils & TypedActionCallers & {
            [action: string]: ActionCaller;
        };
    }
}
export {};
//# sourceMappingURL=client.d.ts.map