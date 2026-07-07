declare module 'virtual:beam' {
  import type { BeamInstance } from '@benqoder/beam'
  export const beam: BeamInstance<any>
}

declare module 'virtual:beam/islands' {
  const islands: Record<string, () => Promise<unknown>>
  export { islands }
  export default islands
}
