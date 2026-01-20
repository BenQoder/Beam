declare module 'idiomorph' {
  export const Idiomorph: {
    morph(target: Element, html: string, options?: { morphStyle?: 'innerHTML' | 'outerHTML' }): void
  }
}
