export type BehaviorUpdateKind = 'props' | 'content';
export interface BehaviorUpdate {
    readonly kind: BehaviorUpdateKind;
}
export interface BehaviorInstance {
    update?(change: BehaviorUpdate): void | Promise<void>;
}
export interface BehaviorContext<Props> {
    readonly root: HTMLElement;
    readonly props: Props;
    readonly signal: AbortSignal;
    reactive<T extends object>(initial: T): T;
    effect(fn: () => void): void;
    on(target: EventTarget, event: string, listener: EventListener, options?: AddEventListenerOptions): void;
    cleanup(fn: () => void | Promise<void>): void;
    getState(id: string): object | undefined;
}
export type Behavior<Props = Record<string, unknown>> = (context: BehaviorContext<Props>) => void | BehaviorInstance | Promise<void | BehaviorInstance>;
export interface BehaviorCapabilities {
    readonly actions?: readonly string[];
    readonly readsState?: readonly string[];
    readonly writesState?: readonly string[];
    readonly roles?: readonly string[];
}
export interface BehaviorDefinition<Props = Record<string, unknown>> {
    readonly mount: Behavior<Props>;
    readonly parseProps?: (value: string | null, root: HTMLElement) => Props;
    readonly capabilities?: BehaviorCapabilities;
}
type AnyBehaviorDefinition = BehaviorDefinition<any>;
interface CleanupRecord {
    called: boolean;
    fn: () => void | Promise<void>;
}
interface MountedBehavior {
    root: HTMLElement;
    name: string;
    definition: AnyBehaviorDefinition;
    props: unknown;
    controller: AbortController;
    cleanups: CleanupRecord[];
    settleScopes: Set<Node>;
    missingStateWarnings: Set<string>;
    instance?: BehaviorInstance;
    state: 'mounting' | 'mounted' | 'failed' | 'destroyed';
    mountTask: Promise<void>;
    pendingUpdates: Set<BehaviorUpdateKind>;
    updateWorkerRunning: boolean;
}
export declare function defineBehavior<Props = Record<string, unknown>>(behavior: Behavior<Props>): BehaviorDefinition<Props>;
export declare function defineBehavior<Props = Record<string, unknown>>(behavior: BehaviorDefinition<Props>): BehaviorDefinition<Props>;
export declare function scanBehaviors(root?: ParentNode): void;
export declare function notifyBehaviorContentChanged(changedRoot: Element): void;
export declare function registerBehaviors(definitions: Record<string, Behavior<any> | BehaviorDefinition<any>>): void;
export declare function behaviorsSettled(scope?: ParentNode): Promise<void>;
export declare const __beamBehaviorInternals: {
    registrations: Map<string, AnyBehaviorDefinition>;
    mounted: Map<HTMLElement, MountedBehavior>;
};
export {};
//# sourceMappingURL=behaviors.d.ts.map