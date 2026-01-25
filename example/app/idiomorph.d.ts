declare module 'idiomorph' {
  interface MorphOptions {
    morphStyle?: 'innerHTML' | 'outerHTML'
    ignoreActive?: boolean
    ignoreActiveValue?: boolean
    head?: {
      style?: 'merge' | 'append' | 'morph' | 'none'
    }
    callbacks?: {
      beforeNodeAdded?: (node: Node) => boolean
      afterNodeAdded?: (node: Node) => void
      beforeNodeMorphed?: (oldNode: Node, newNode: Node) => boolean
      afterNodeMorphed?: (oldNode: Node, newNode: Node) => void
      beforeNodeRemoved?: (node: Node) => boolean
      afterNodeRemoved?: (node: Node) => void
    }
  }

  export const Idiomorph: {
    morph(oldNode: Element | string, newContent: Element | string, options?: MorphOptions): void
  }
}
