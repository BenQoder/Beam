/**
 * Renders a Hono JSX node to a string.
 * Handles both sync and async JSX nodes.
 */
export function render(node) {
    return Promise.resolve(node).then((n) => n.toString());
}
