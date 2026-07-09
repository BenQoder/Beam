/**
 * Typed-action registry, filled by the generated beam-actions.d.ts
 * (beamPlugin `actionTypes`): maps action module paths to their module types.
 * Declared here — augmentations must target '@benqoder/beam' directly, and
 * module augmentation only merges in the declaring module.
 * Do not populate manually.
 */
export interface BeamRegisteredActionModules {
}
export { createBeam, KVSession, CookieSession, beamTokenMeta } from './createBeam';
export { render } from './render';
export { Island, beamIslandImportMap, ISLAND_SHARED_MODULES } from './island';
export type { IslandProps } from './island';
export { collectActions, } from './collect';
export type { ActionHandler, ActionResponse, ModalOptions, DrawerOptions, NamedStateUpdates, IslandPropsUpdates, BeamServerEvent, RegisteredActionName, BeamActionName, BeamActionParams, BeamActionJson, BeamConfig, BeamInstance, BeamInitOptions, BeamUser, BeamContext, BeamVariables, AuthResolver, BeamSession, SessionConfig, SessionStorageFactory, AuthTokenPayload, VisitMode, VisitOptions, VisitResponse, } from './types';
//# sourceMappingURL=index.d.ts.map