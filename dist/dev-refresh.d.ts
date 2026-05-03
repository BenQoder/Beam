declare function rootSelector(): string;
declare function preserveAndSwap(target: Element, source: Element): void;
declare function morphElement(target: Element, source: Element): void;
declare function elementKey(el: Element): string;
declare function notifyAfterMorph(root: Element): void;
export declare const __beamDevRefreshInternals: {
    morphElement: typeof morphElement;
    preserveAndSwap: typeof preserveAndSwap;
    notifyAfterMorph: typeof notifyAfterMorph;
    rootSelector: typeof rootSelector;
    elementKey: typeof elementKey;
};
export {};
//# sourceMappingURL=dev-refresh.d.ts.map