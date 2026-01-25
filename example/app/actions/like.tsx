import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { LikeButton } from '../components/LikeButton'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function like(ctx: BeamContext<Env>, { postId }: Record<string, unknown>): Promise<string> {
  await ctx.env.DB.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?')
    .bind(postId)
    .run()

  const post = await ctx.env.DB.prepare('SELECT likes FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ likes: number }>()

  return render(<LikeButton postId={postId as string} count={post?.likes ?? 0} />)
}
