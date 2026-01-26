import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext, ActionResponse } from '@benqoder/beam'
import type { Env } from '../types'
import { ProductList } from '../components/ProductList'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function deleteProduct(ctx: BeamContext<Env>, { id }: Record<string, unknown>): Promise<string> {
  await ctx.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()

  const products = await ctx.env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
  return render(<ProductList products={products.results as Array<{ id: string; name: string; price: number }>} />)
}

// Modal for confirming product deletion
export async function confirmDeleteModal(ctx: BeamContext<Env>, { id, name, target = '#product-list' }: Record<string, unknown>): Promise<ActionResponse> {
  return ctx.modal(render(
    <div>
      <header class="modal-header">
        <h2>Confirm Delete</h2>
        <button type="button" beam-close aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>
      <div class="modal-body">
        <p>Are you sure you want to delete <strong>"{name}"</strong>?</p>
        <p class="text-muted">This action cannot be undone.</p>
      </div>
      <div class="modal-actions">
        <button type="button" beam-close>Cancel</button>
        <button
          beam-action="deleteProduct"
          beam-params={JSON.stringify({ id })}
          beam-target={target as string}
          beam-close
          class="btn-danger"
        >
          Delete
        </button>
      </div>
    </div>
  ), { size: 'small' })
}
