import { jsx as _jsx } from "hono/jsx/jsx-runtime";
/**
 * Render a React island mount point.
 *
 * @example
 * <Island name="Chart" id="salesChart" props={{ series }}>
 *   <div class="skeleton" />
 * </Island>
 */
export function Island({ name, id, props, src, load, remount, class: className, children }) {
    return (_jsx("div", { "beam-island": name, ...(id ? { 'beam-id': id } : {}), "beam-props": JSON.stringify(props ?? {}), ...(src ? { 'beam-island-src': src } : {}), ...(load && load !== 'eager' ? { 'beam-island-load': load } : {}), ...(remount ? { 'beam-island-remount': '' } : {}), ...(className ? { class: className } : {}), children: children }));
}
/**
 * The bare module specifiers dynamic island modules may import, mapped to the
 * stable shared files the beamPlugin emits. Kept in one place so the import
 * map and the plugin's emitted chunks never drift apart.
 */
export const ISLAND_SHARED_MODULES = {
    react: 'react.js',
    'react/jsx-runtime': 'react-jsx-runtime.js',
    'react-dom/client': 'react-dom-client.js',
    '@benqoder/beam/react': 'beam-react.js',
};
/**
 * Import map tag for dynamic islands. Emit it in your document <head> (before
 * any module scripts) so remote island modules resolve bare 'react' /
 * '@benqoder/beam/react' imports to the single shared instance the Beam
 * runtime uses. The beamPlugin emits the shared files for every island-capable
 * client build.
 *
 * @example
 * // in your renderer/layout head (hono/jsx):
 * import { raw } from 'hono/html'
 * {raw(beamIslandImportMap())}
 * {raw(beamIslandImportMap({ extra: { '@ui/button': '/islands/ui/button@f3a9.js' } }))}
 */
export function beamIslandImportMap(options = {}) {
    // string form kept for back-compat: beamIslandImportMap('/assets/shared/')
    const { base = '/static/beam-shared/', extra, nonce } = typeof options === 'string' ? { base: options, extra: undefined, nonce: undefined } : options;
    const imports = Object.create(null);
    for (const [specifier, file] of Object.entries(ISLAND_SHARED_MODULES)) {
        imports[specifier] = `${base}${file}`;
    }
    Object.assign(imports, extra);
    // Script data must escape "<" so tenant/config values cannot terminate the
    // tag with </script> and inject executable markup.
    const json = JSON.stringify({ imports })
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
    const nonceAttribute = nonce
        ? ` nonce="${nonce.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"`
        : '';
    return `<script type="importmap"${nonceAttribute}>${json}</script>`;
}
/**
 * Build a Content-Security-Policy value tuned for Beam apps. A CSP is the
 * strongest blunt-force mitigation for any HTML-injection XSS (an injected
 * beam-* expression attribute can't run scripts it isn't allowed to load).
 *
 * Emit it as a header (preferred) or a <meta http-equiv>. Note: Beam's
 * reactivity evaluates beam-* expressions via new Function, so
 * script-src needs 'unsafe-eval' when reactivity is used — see
 * allowReactivityEval. Islands load ES modules from your islandSources; add
 * any non-'self' origins here.
 *
 * @example
 * // as a Hono header:
 * c.header('Content-Security-Policy', beamCsp({ islandSources: ['https://cdn.example.com'] }))
 */
export function beamCsp(options = {}) {
    const self = "'self'";
    const scriptSrc = [self, ...(options.islandSources ?? []), ...(options.scriptSrc ?? [])];
    if (options.allowReactivityEval !== false)
        scriptSrc.push("'unsafe-eval'");
    if (options.scriptNonce) {
        // CSP nonces are base64/base64url values. Reject rather than interpolate
        // malformed input into a response header.
        if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(options.scriptNonce)) {
            throw new TypeError('Beam CSP scriptNonce must be a base64 or base64url value');
        }
        scriptSrc.push(`'nonce-${options.scriptNonce}'`);
    }
    else if (options.allowUnsafeInlineScripts) {
        scriptSrc.push("'unsafe-inline'");
    }
    const directives = {
        'default-src': [self],
        // Inline scripts are denied by default. Dynamic-island import maps must
        // carry the matching request nonce.
        'script-src': scriptSrc,
        'style-src': [self, "'unsafe-inline'", ...(options.styleSrc ?? [])],
        'img-src': [self, 'data:', 'blob:', 'https:', ...(options.imgSrc ?? [])],
        // WebSocket RPC: same-origin ws/wss.
        'connect-src': [self, ...(options.connectSrc ?? [])],
        'object-src': ["'none'"],
        'base-uri': [self],
        'frame-ancestors': [self],
    };
    return Object.entries(directives)
        .map(([name, values]) => `${name} ${Array.from(new Set(values)).join(' ')}`)
        .join('; ');
}
