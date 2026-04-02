export declare const BEAM_ACTION_STREAM_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";
export declare const BEAM_ACTION_REQUEST_HEADER = "X-Beam-Request";
export declare const BEAM_ACTION_TRANSPORT_HEADER = "X-Beam-Transport";
export declare function getBeamActionBasePath(endpoint: string): string;
export declare function encodeBeamActionStream<T>(stream: ReadableStream<T>): ReadableStream<Uint8Array>;
export declare function decodeBeamActionStream<T>(stream: ReadableStream<Uint8Array>): ReadableStream<T>;
//# sourceMappingURL=actionStream.d.ts.map