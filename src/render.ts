import type { HtmlEscapedString } from 'hono/utils/html'

/**
 * Renders a Hono JSX node to a string.
 * Handles both sync and async JSX nodes.
 */
export function render(
  node: HtmlEscapedString | Promise<HtmlEscapedString>
): Promise<string> {
  return Promise.resolve(node).then((n) => n.toString())
}
