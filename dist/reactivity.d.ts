declare function initReactivity(): void;
export declare const beamReactivity: {
    /**
     * Get reactive state by element or named ID
     * @param elOrId - Element with beam-state or string ID from beam-id
     */
    getState: (elOrId: Element | string) => object | undefined;
    /**
     * Batch multiple state updates into a single flush
     * @param fn - Function containing state mutations
     */
    batch: (fn: () => void) => void;
    /**
     * Manually initialize reactivity (called automatically on import)
     */
    init: typeof initReactivity;
};
export default beamReactivity;
//# sourceMappingURL=reactivity.d.ts.map