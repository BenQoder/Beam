import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then((n) => n.toString())
}

/**
 * Get current user info - demonstrates auth context in Beam actions
 */
export async function getCurrentUser(
  ctx: BeamContext<Env>,
  _data: Record<string, unknown>
): Promise<string> {
  if (ctx.user) {
    return render(
      <div class="user-info authenticated">
        <div class="user-avatar">{(ctx.user.name as string)?.[0] || '?'}</div>
        <div class="user-details">
          <div class="user-name">{ctx.user.name as string}</div>
          <div class="user-email">{ctx.user.email as string}</div>
          <span class={`badge badge-${ctx.user.role}`}>{ctx.user.role as string}</span>
        </div>
        <style>{`
          .user-info.authenticated {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .user-avatar {
            width: 48px;
            height: 48px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            font-weight: bold;
          }
          .user-details .user-name {
            font-weight: 600;
          }
          .user-details .user-email {
            color: #666;
            font-size: 0.9rem;
          }
          .badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 500;
            text-transform: uppercase;
            margin-top: 0.25rem;
          }
          .badge-admin { background: #fee2e2; color: #dc2626; }
          .badge-user { background: #dbeafe; color: #2563eb; }
          .badge-guest { background: #f3f4f6; color: #6b7280; }
        `}</style>
      </div>
    )
  }
  return render(
    <div class="user-info guest">
      <span>Not signed in - </span>
      <a href="/login">Sign In</a>
      <style>{`
        .user-info.guest {
          color: #666;
        }
        .user-info.guest a {
          color: #3b82f6;
          text-decoration: none;
        }
        .user-info.guest a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
