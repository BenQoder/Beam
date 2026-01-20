// Main server-side exports for @anthropic/beam

export { createBeam } from './createBeam'
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
} from './types'
