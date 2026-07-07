const VIRTUAL_MODULE_ID = 'virtual:beam';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;
const VIRTUAL_ISLANDS_MODULE_ID = 'virtual:beam/islands';
const RESOLVED_VIRTUAL_ISLANDS_MODULE_ID = '\0' + VIRTUAL_ISLANDS_MODULE_ID;
// Shared modules for dynamic islands: emitted with stable file names so the
// import map in beamIslandImportMap() can point at them across deploys.
// Keys are virtual module ids, values are [emitted fileName, re-export code].
const SHARED_MODULE_PREFIX = 'beam-shared:';
const RESOLVED_SHARED_MODULE_PREFIX = '\0' + SHARED_MODULE_PREFIX;
// react ships CommonJS, so `export * from 'react'` cannot forward named
// exports through Rollup's interop — remote modules importing
// `{ useState } from 'react'` would fail at runtime. Explicit facades
// destructure the public API into real named exports instead (destructuring
// a key missing in some react version yields undefined, not an error).
const REACT_FACADE = `import * as R from 'react'
const react = R.default && R.default.useState ? R.default : R
export const {
  Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense,
  act, cache, cloneElement, createContext, createElement, createRef, forwardRef,
  isValidElement, lazy, memo, startTransition, use, useActionState, useCallback,
  useContext, useDebugValue, useDeferredValue, useEffect, useId,
  useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo,
  useOptimistic, useReducer, useRef, useState, useSyncExternalStore,
  useTransition, version,
} = react
export default react
`;
const JSX_RUNTIME_FACADE = `import * as R from 'react/jsx-runtime'
const runtime = R.default && R.default.jsx ? R.default : R
export const { Fragment, jsx, jsxs } = runtime
`;
const REACT_DOM_CLIENT_FACADE = `import * as R from 'react-dom/client'
const client = R.default && R.default.createRoot ? R.default : R
export const { createRoot, hydrateRoot } = client
`;
const SHARED_MODULES = {
    react: ['static/beam-shared/react.js', REACT_FACADE],
    'jsx-runtime': ['static/beam-shared/react-jsx-runtime.js', JSX_RUNTIME_FACADE],
    'react-dom-client': ['static/beam-shared/react-dom-client.js', REACT_DOM_CLIENT_FACADE],
    'beam-react': [
        'static/beam-shared/beam-react.js',
        // our own dist is real ESM — star re-export forwards named exports fine
        "export * from '@benqoder/beam/react'\n",
    ],
};
/**
 * Vite plugin that auto-generates the beam instance from handler files.
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { beamPlugin } from '@benqoder/beam/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     beamPlugin({
 *       actions: '/app/actions/*.tsx',
 *     })
 *   ]
 * })
 * ```
 *
 * Then import the beam instance:
 * ```typescript
 * import { beam } from 'virtual:beam'
 * ```
 */
export function beamPlugin(options = {}) {
    const { actions = '/app/actions/*.tsx', auth, session, islands = '/app/islands/*.tsx', islandSources, } = options;
    // '/app/islands/*.tsx' → '/app/islands/' — used to match absolute module ids
    const islandsPrefix = islands ? islands.slice(0, islands.indexOf('*')) : null;
    const dynamicIslands = Boolean(islandSources?.length);
    let emitSharedModules = false;
    return {
        name: 'beam-plugin',
        configResolved(config) {
            // Shared react files only make sense in the client build artifact —
            // skip the SSR/worker build and the dev server (no emitFile there).
            emitSharedModules = dynamicIslands && config.command === 'build' && !config.build.ssr;
        },
        buildStart() {
            if (!emitSharedModules)
                return;
            for (const [key, [fileName]] of Object.entries(SHARED_MODULES)) {
                this.emitFile({
                    type: 'chunk',
                    id: SHARED_MODULE_PREFIX + key,
                    fileName,
                    preserveSignature: 'strict',
                });
            }
        },
        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) {
                return RESOLVED_VIRTUAL_MODULE_ID;
            }
            if (id === VIRTUAL_ISLANDS_MODULE_ID) {
                return RESOLVED_VIRTUAL_ISLANDS_MODULE_ID;
            }
            if (id.startsWith(SHARED_MODULE_PREFIX)) {
                return '\0' + id;
            }
        },
        transform(code, id) {
            // Compile island files with the React JSX runtime (the rest of the app
            // uses hono/jsx). Same-line pragma keeps line numbers intact.
            if (!islandsPrefix)
                return;
            const file = id.split('?')[0];
            if (!file.includes(islandsPrefix) || !/\.[tj]sx$/.test(file))
                return;
            if (code.includes('@jsxImportSource'))
                return;
            return { code: `/** @jsxImportSource react */ ${code}`, map: null };
        },
        load(id) {
            if (id.startsWith(RESOLVED_SHARED_MODULE_PREFIX)) {
                const key = id.slice(RESOLVED_SHARED_MODULE_PREFIX.length);
                return SHARED_MODULES[key]?.[1];
            }
            if (id === RESOLVED_VIRTUAL_ISLANDS_MODULE_ID) {
                const allowSources = dynamicIslands
                    ? `import { allowIslandSources } from '@benqoder/beam/islands'
allowIslandSources(${JSON.stringify(islandSources)})
`
                    : '';
                if (!islands) {
                    return `${allowSources}export const islands = {}\nexport default islands\n`;
                }
                // Lazy glob: each island (and React itself) is code-split and only
                // downloaded on pages that use it.
                return `${allowSources}
export const islands = import.meta.glob('${islands}')
export default islands
`;
            }
            if (id === RESOLVED_VIRTUAL_MODULE_ID) {
                const authImport = auth ? `import auth from '${auth}'` : '';
                const authConfig = auth ? ', auth' : '';
                // Generate session config code
                let sessionConfig = '';
                let storageImport = '';
                if (session) {
                    const sessionOpts = typeof session === 'object' ? session : {};
                    const secretEnvKey = sessionOpts.secretEnvKey || 'SESSION_SECRET';
                    const cookieName = sessionOpts.cookieName || 'beam_sid';
                    const maxAge = sessionOpts.maxAge || 365 * 24 * 60 * 60;
                    const storagePath = sessionOpts.storage;
                    // Import custom storage factory if provided
                    if (storagePath) {
                        storageImport = `import storageFactory from '${storagePath}'`;
                    }
                    // Session secret is resolved at runtime from env
                    sessionConfig = `, session: {
    secret: '', // Will be resolved from env.${secretEnvKey} at runtime
    secretEnvKey: '${secretEnvKey}',
    cookieName: '${cookieName}',
    maxAge: ${maxAge}${storagePath ? ',\n    storageFactory' : ''}
  }`;
                }
                // Generate plain JavaScript - TypeScript types are handled via virtual-beam.d.ts
                return `
import { createBeam, collectActions } from '@benqoder/beam'
${authImport}
${storageImport}

const actions = collectActions(import.meta.glob('${actions}', { eager: true }))

export const beam = createBeam({ actions${authConfig}${sessionConfig} })
`;
            }
        },
    };
}
export default beamPlugin;
