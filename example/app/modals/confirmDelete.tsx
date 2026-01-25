import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { ModalFrame } from '../components/ModalFrame'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function confirmDelete(_ctx: BeamContext<Env>, { id, name, target = '#product-list' }: Record<string, unknown>): Promise<string> {
  return render(
    <ModalFrame title="Confirm Delete">
      <p>Are you sure you want to delete <strong>"{name}"</strong>?</p>
      <p class="text-muted">This action cannot be undone.</p>
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
    </ModalFrame>
  )
}
