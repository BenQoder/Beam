import type { HtmlEscapedString } from 'hono/utils/html';
/**
 * Renders a Hono JSX node to a string.
 * Handles both sync and async JSX nodes.
 */
export declare function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string>;
//# sourceMappingURL=render.d.ts.map