import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { ModalFrame } from '../components/ModalFrame'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function demoModal(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  return render(
    <ModalFrame title="Simple Modal">
      <p>This is a simple modal opened via <code>beam-modal</code>.</p>
      <p>Press ESC or click outside to close.</p>
      <div class="modal-actions">
        <button beam-close>Close</button>
      </div>
    </ModalFrame>
  )
}

export async function demoFormModal(_ctx: BeamContext<Env>, { title, value }: Record<string, unknown>): Promise<string> {
  return render(
    <ModalFrame title={title as string || 'Form Modal'}>
      <p>This modal received params via <code>beam-data-*</code>:</p>
      <form beam-action="submitDemo" beam-target="#demo-result" beam-close>
        <div class="form-group">
          <label for="demo-input">Value</label>
          <input id="demo-input" name="value" type="text" value={value as string || ''} autofocus />
        </div>
        <div class="modal-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Submit</button>
        </div>
      </form>
    </ModalFrame>
  )
}
