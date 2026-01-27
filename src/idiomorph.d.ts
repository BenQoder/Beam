declare module 'idiomorph' {
  interface IdiomorphCallbacks {
    beforeNodeAdded?: (node: Node) => boolean
    afterNodeAdded?: (node: Node) => void
    beforeNodeMorphed?: (fromEl: Element, toEl: Element) => boolean
    afterNodeMorphed?: (fromEl: Element, toEl: Element) => void
    beforeNodeRemoved?: (node: Node) => boolean
    afterNodeRemoved?: (node: Node) => void
    beforeAttributeUpdated?: (attributeName: string, node: Element, mutationType: string) => boolean
  }

  interface IdiomorphOptions {
    morphStyle?: 'innerHTML' | 'outerHTML'
    callbacks?: IdiomorphCallbacks
    ignoreActive?: boolean
    ignoreActiveValue?: boolean
    head?: {
      style?: 'merge' | 'append' | 'morph' | 'none'
    }
  }

  export const Idiomorph: {
    morph(target: Element, html: string, options?: IdiomorphOptions): void
  }
}
