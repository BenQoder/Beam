/**
 * Beam Reactivity Directives Registry
 *
 * Authoritative list of all valid beam-* attributes for the reactivity system.
 * Import from '@benqoder/beam/directives' to use in validators or tooling.
 *
 * Note: This covers reactivity directives only (reactivity.ts).
 * Server-action directives (beam-action, beam-poll, etc.) are in client.ts.
 */
/**
 * All valid beam reactivity directives.
 * Use `BEAM_REACTIVITY_DIRECTIVES` for the full registry object.
 * Use `BEAM_EXACT_NAMES` and `BEAM_PREFIX_NAMES` for fast lookup sets.
 */
export const BEAM_REACTIVITY_DIRECTIVES = [
    {
        name: 'beam-state',
        description: 'Declares reactive state on an element. All descendant directives share this scope. ' +
            'Accepts JSON objects, semicolon-separated key-value pairs, or a simple primitive value (requires beam-id).',
        example: '<div beam-state="open: false; tab: 0">\n  ...\n</div>',
        category: 'state',
    },
    {
        name: 'beam-id',
        description: 'Names the state scope for cross-scope access via beam-state-ref. ' +
            'Also required when beam-state holds a simple primitive value. ' +
            'Must be camelCase — dashes break JS expression evaluation.',
        example: '<div beam-state="false" beam-id="menu">\n  ...\n</div>',
        category: 'state',
    },
    {
        name: 'beam-state-ref',
        description: 'References a named state scope (set via beam-id) from outside its container. ' +
            'Allows elements anywhere on the page to read or mutate that state.',
        example: '<button beam-state-ref="menu" beam-click="open = !open">Toggle menu</button>',
        category: 'state',
    },
    {
        name: 'beam-init',
        description: 'Runs a JavaScript expression once after the state scope is fully initialized. ' +
            'Ideal for setting up intervals (auto-play carousels), timers, or derived initial values. ' +
            'Has full access to the reactive state via the scope context.',
        example: '<div beam-state="index: 0; total: 4"\n' +
            '     beam-init="setInterval(() => { index = (index + 1) % total }, 3000)">\n' +
            '  ...\n' +
            '</div>',
        category: 'state',
    },
    {
        name: 'beam-click',
        description: 'Evaluates a JS expression when the element is clicked. ' +
            'Has access to reactive state and receives the native click event as `$event`. ' +
            'Use semicolons to chain multiple statements.',
        example: '<button beam-click="count++">Increment</button>',
        category: 'event',
    },
    {
        name: 'beam-state-toggle',
        description: 'Toggles a boolean state property on click. ' +
            'Optionally force-sets to a value with the "prop=value" syntax. ' +
            'Automatically manages aria-pressed and aria-expanded attributes.',
        example: '<button beam-state-toggle="open">Toggle\n' +
            '<!-- Force open:  beam-state-toggle="open=true"  -->\n' +
            '<!-- Force close: beam-state-toggle="open=false" -->',
        category: 'event',
    },
    {
        name: 'beam-show',
        description: 'Controls element visibility reactively. Sets display:none when the expression is falsy. ' +
            'Re-evaluates automatically whenever referenced state changes.',
        example: '<div beam-show="open">Visible when open is truthy</div>',
        category: 'display',
    },
    {
        name: 'beam-class',
        description: 'Conditionally applies CSS classes. ' +
            'Accepts "className: condition" pairs (semicolon-separated) or a JSON object. ' +
            'Quote class names that contain spaces or hyphens.',
        example: '<button beam-class="active: tab === 0; \'font-bold\': isSelected">Tab 1</button>',
        category: 'display',
    },
    {
        name: 'beam-text',
        description: 'Reactively sets the text content of an element to the result of a JS expression. ' +
            'The element\'s existing text children are replaced.',
        example: '<span beam-text="count + \' items selected\'"></span>',
        category: 'binding',
    },
    {
        name: 'beam-attr-',
        isPrefix: true,
        description: 'Reactively binds any HTML attribute. Append the target attribute name after the prefix. ' +
            'Setting to false or null removes the attribute; true sets an empty attribute.',
        example: '<!-- Animated slide -->\n' +
            '<div beam-attr-style="`transform: translateX(${index * 100}%)`"></div>\n' +
            '<!-- Conditional disabled -->\n' +
            '<button beam-attr-disabled="!isReady"></button>',
        category: 'binding',
    },
    {
        name: 'beam-model',
        description: 'Creates a two-way binding between a form input and a state property. ' +
            'The input value reflects state and updates state on user input/change. ' +
            'Supports text, number, checkbox, radio, and select elements.',
        example: '<input beam-model="query" type="text" placeholder="Search..." />',
        category: 'form',
    },
];
/** Set of exact directive names for O(1) lookup */
export const BEAM_EXACT_NAMES = new Set(BEAM_REACTIVITY_DIRECTIVES.filter(d => !d.isPrefix).map(d => d.name));
/** Prefix strings for wildcard directives (e.g. 'beam-attr-') */
export const BEAM_PREFIX_NAMES = BEAM_REACTIVITY_DIRECTIVES
    .filter(d => d.isPrefix)
    .map(d => d.name);
/**
 * Check if a given beam-* attribute name is a valid reactivity directive.
 * @param attr Full attribute name, e.g. 'beam-attr-style' or 'beam-show'
 */
export function isValidBeamReactivityDirective(attr) {
    if (BEAM_EXACT_NAMES.has(attr))
        return true;
    return BEAM_PREFIX_NAMES.some(prefix => attr.startsWith(prefix));
}
