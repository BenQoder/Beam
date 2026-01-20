const VIRTUAL_MODULE_ID = 'virtual:beam';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;
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
 *       modals: '/app/modals/*.tsx',
 *       drawers: '/app/drawers/*.tsx',
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
    const { actions = '/app/actions/*.tsx', modals = '/app/modals/*.tsx', drawers = '/app/drawers/*.tsx', auth, session, } = options;
    return {
        name: 'beam-plugin',
        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) {
                return RESOLVED_VIRTUAL_MODULE_ID;
            }
        },
        load(id) {
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
import { createBeam, collectHandlers } from '@benqoder/beam'
${authImport}
${storageImport}

const { actions, modals, drawers } = collectHandlers({
  actions: import.meta.glob('${actions}', { eager: true }),
  modals: import.meta.glob('${modals}', { eager: true }),
  drawers: import.meta.glob('${drawers}', { eager: true }),
})

export const beam = createBeam({ actions, modals, drawers${authConfig}${sessionConfig} })
`;
            }
        },
    };
}
export default beamPlugin;
