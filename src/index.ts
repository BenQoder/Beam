// Main server-side exports for @benqoder/beam

export { createBeam, KVSession, CookieSession, beamTokenMeta } from './createBeam'
export { render } from './render'
export { ModalFrame } from './ModalFrame'
export { DrawerFrame } from './DrawerFrame'

// Auto-discovery utilities
export {
  collectActions,
  collectModals,
  collectDrawers,
  collectHandlers,
} from './collect'

// Type exports
export type {
  ActionHandler,
  ModalHandler,
  DrawerHandler,
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
} from './types'
