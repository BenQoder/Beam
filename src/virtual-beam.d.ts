/**
 * Legacy virtual-module declarations.
 *
 * New applications use an explicit app/beam.ts and register island globs
 * directly from app/client.ts. These declarations remain so existing
 * applications continue to type-check without migration.
 */
declare module 'virtual:beam' {
  import type { BeamInstance } from '@benqoder/beam'
  export const beam: BeamInstance<any>
}

declare module 'virtual:beam/islands' {
  import type { IslandRegistry } from '@benqoder/beam/islands'
  const islands: IslandRegistry
  export { islands }
  export default islands
}
