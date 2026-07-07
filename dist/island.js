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
 * runtime uses. The beamPlugin emits the shared files when `islandSources`
 * is configured.
 *
 * @example
 * // in your renderer/layout head (hono/jsx):
 * import { raw } from 'hono/html'
 * {raw(beamIslandImportMap())}
 * {raw(beamIslandImportMap({ extra: { '@ui/button': '/islands/ui/button@f3a9.js' } }))}
 */
export function beamIslandImportMap(options = {}) {
    // string form kept for back-compat: beamIslandImportMap('/assets/shared/')
    const { base = '/static/beam-shared/', extra } = typeof options === 'string' ? { base: options, extra: undefined } : options;
    const imports = {};
    for (const [specifier, file] of Object.entries(ISLAND_SHARED_MODULES)) {
        imports[specifier] = `${base}${file}`;
    }
    Object.assign(imports, extra);
    return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
}
