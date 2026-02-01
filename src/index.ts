// Main server-side exports for @benqoder/beam

export { createBeam, KVSession, CookieSession, beamTokenMeta } from './createBeam'
export { render } from './render'

// Auto-discovery utilities
export {
  collectActions,
} from './collect'

// Islands functionality
export {
  defineIsland,
  registerIsland,
  hydrateIslands,
  scanIslands,
  getIslandRegistry,
} from './islands'

// Type exports
export type {
  ActionHandler,
  ActionResponse,
  ModalOptions,
  DrawerOptions,
  BeamConfig,
  BeamInstance,
  BeamInitOptions,
  BeamUser,
  BeamContext,
  BeamVariables,
  AuthResolver,
  BeamSession,
  SessionConfig,
  SessionStorageFactory,
  AuthTokenPayload,
  IslandProps,
  IslandComponent,
  IslandDefinition,
} from './types'
