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
     * Apply a server-driven update to a named state created with beam-id.
     */
    updateState: (id: string, value: unknown) => boolean;
    /**
     * Get a named state, creating and registering it when missing.
     * Lets JS/React code use a named state before (or without) any
     * beam-state element declaring it.
     */
    ensureState: (id: string, initial?: Record<string, unknown>) => object;
    /**
     * Run fn as a reactive effect: it re-runs whenever any reactive state read
     * inside it changes. Returns a dispose function that stops tracking.
     */
    effect: (fn: () => void) => (() => void);
    /**
     * Manually initialize reactivity (called automatically on import)
     */
    init: typeof initReactivity;
    /**
     * Scan a DOM subtree for newly inserted reactive elements.
     */
    scan: (root?: ParentNode) => void;
};
export default beamReactivity;
//# sourceMappingURL=reactivity.d.ts.map