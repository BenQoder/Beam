function splitLines(buffer) {
    const parts = buffer.split('\n');
    const rest = parts.pop() ?? '';
    return { lines: parts, rest };
}
export const BEAM_ACTION_STREAM_CONTENT_TYPE = 'application/x-ndjson; charset=utf-8';
export const BEAM_ACTION_REQUEST_HEADER = 'X-Beam-Request';
export const BEAM_ACTION_TRANSPORT_HEADER = 'X-Beam-Transport';
export function getBeamActionBasePath(endpoint) {
    if (endpoint === '/')
        return '/actions';
    const normalized = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    return `${normalized}/actions`;
}
export function encodeBeamActionStream(stream) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            const reader = stream.getReader();
            void (async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
                    }
                    controller.close();
                }
                catch (error) {
                    controller.error(error);
                }
                finally {
                    reader.releaseLock();
                }
            })();
        },
    });
}
export function decodeBeamActionStream(stream) {
    const decoder = new TextDecoder();
    return new ReadableStream({
        start(controller) {
            const reader = stream.getReader();
            let buffer = '';
            const flush = (final) => {
                const { lines, rest } = splitLines(buffer);
                buffer = rest;
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed)
                        continue;
                    controller.enqueue(JSON.parse(trimmed));
                }
                if (final) {
                    const trimmed = buffer.trim();
                    if (trimmed) {
                        controller.enqueue(JSON.parse(trimmed));
                    }
                    buffer = '';
                }
            };
            void (async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        buffer += decoder.decode(value, { stream: true });
                        flush(false);
                    }
                    buffer += decoder.decode();
                    flush(true);
                    controller.close();
                }
                catch (error) {
                    controller.error(error);
                }
                finally {
                    reader.releaseLock();
                }
            })();
        },
    });
}
