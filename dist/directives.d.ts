/**
 * Beam Reactivity Directives Registry
 *
 * Authoritative list of all valid beam-* attributes for the reactivity system.
 * Import from '@benqoder/beam/directives' to use in validators or tooling.
 *
 * Note: This covers reactivity directives only (reactivity.ts).
 * Server-action directives (beam-action, beam-poll, etc.) are in client.ts.
 */
export type DirectiveCategory = 'state' | 'binding' | 'event' | 'display' | 'form';
export interface BeamDirective {
    /** The attribute name (exact) or prefix (when isPrefix is true) */
    name: string;
    /**
     * True when the directive is a prefix pattern.
     * e.g. 'beam-attr-' matches beam-attr-href, beam-attr-style, etc.
     */
    isPrefix?: boolean;
    /** Human-readable description of what this directive does */
    description: string;
    /** Short JSX/HTML usage snippet */
    example: string;
    /** Semantic category */
    category: DirectiveCategory;
}
/**
 * All valid beam reactivity directives.
 * Use `BEAM_REACTIVITY_DIRECTIVES` for the full registry object.
 * Use `BEAM_EXACT_NAMES` and `BEAM_PREFIX_NAMES` for fast lookup sets.
 */
export declare const BEAM_REACTIVITY_DIRECTIVES: BeamDirective[];
/** Set of exact directive names for O(1) lookup */
export declare const BEAM_EXACT_NAMES: ReadonlySet<string>;
/** Prefix strings for wildcard directives (e.g. 'beam-attr-') */
export declare const BEAM_PREFIX_NAMES: readonly string[];
/**
 * Check if a given beam-* attribute name is a valid reactivity directive.
 * @param attr Full attribute name, e.g. 'beam-attr-style' or 'beam-show'
 */
export declare function isValidBeamReactivityDirective(attr: string): boolean;
//# sourceMappingURL=directives.d.ts.map