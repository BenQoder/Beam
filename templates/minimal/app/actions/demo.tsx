import type { BeamContext } from '@benqoder/beam'
import type { HtmlEscapedString } from 'hono/utils/html'
import type { Env } from '../types'

let count = 0

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then((value) => value.toString())
}

export async function increment(_ctx: BeamContext<Env>): Promise<string> {
  count += 1
  return render(<span>{count}</span>)
}

export async function reset(_ctx: BeamContext<Env>): Promise<string> {
  count = 0
  return render(<span>{count}</span>)
}
