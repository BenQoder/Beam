type OverlayError = {
    title: string;
    message: string;
    stack?: string;
};
declare function hideOverlay(): void;
declare function render(): void;
declare function pushError(error: OverlayError): void;
export declare const __beamDevOverlayInternals: {
    pushError: typeof pushError;
    hideOverlay: typeof hideOverlay;
    render: typeof render;
};
export {};
//# sourceMappingURL=dev-overlay.d.ts.map