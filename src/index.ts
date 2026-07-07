// Main server-side exports for @benqoder/beam

export { createBeam, KVSession, CookieSession, beamTokenMeta } from './createBeam'
export { render } from './render'
export { Island, beamIslandImportMap, ISLAND_SHARED_MODULES } from './island'
export type { IslandProps } from './island'

// Auto-discovery utilities
export {
  collectActions,
} from './collect'

// Type exports
export type {
  ActionHandler,
  ActionResponse,
  ModalOptions,
  DrawerOptions,
  NamedStateUpdates,
  IslandPropsUpdates,
  BeamServerEvent,
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
  VisitMode,
  VisitOptions,
  VisitResponse,
} from './types'
