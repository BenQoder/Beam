import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { ModalFrame } from '../components/ModalFrame'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function createProduct(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  return render(
    <ModalFrame title="New Product">
      <form
        
        beam-action="createProduct"
        beam-target="#product-list"
        beam-close
        beam-reset
      >
        <div class="form-group">
          <label for="name">Name</label>
          <input id="name" name="name" type="text" required autofocus />
        </div>
        <div class="form-group">
          <label for="price">Price</label>
          <input id="price" name="price" type="number" step="0.01" min="0" required />
        </div>
        <div class="modal-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Create Product</button>
        </div>
      </form>
    </ModalFrame>
  )
}
