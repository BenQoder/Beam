import type { HtmlEscapedString } from 'hono/utils/html'
import type { BeamContext } from '@benqoder/beam'
import type { Env } from '../types'
import { DrawerFrame } from '../components/DrawerFrame'

function render(node: HtmlEscapedString | Promise<HtmlEscapedString>): Promise<string> {
  return Promise.resolve(node).then(n => n.toString())
}

export async function productDrawer(_ctx: BeamContext<Env>, { id, name }: Record<string, unknown>): Promise<string> {
  return render(
    <DrawerFrame title={`Product #${id}`}>
      <div class="drawer-section">
        <h3>{name as string || 'Product Details'}</h3>
        <p>This is a drawer opened via <code>beam-drawer</code> attribute.</p>
        <p>The drawer slides in from the side and can be closed by:</p>
        <ul>
          <li>Pressing ESC</li>
          <li>Clicking the backdrop</li>
          <li>Clicking the close button</li>
        </ul>
      </div>
      <div class="drawer-section">
        <h4>Product Info</h4>
        <dl class="drawer-info">
          <dt>ID</dt>
          <dd>{id as string}</dd>
          <dt>Name</dt>
          <dd>{name as string || 'N/A'}</dd>
          <dt>Status</dt>
          <dd><span class="badge badge-success">Active</span></dd>
        </dl>
      </div>
      <div class="drawer-actions">
        <button beam-close>Close</button>
        <button class="btn-primary">Edit Product</button>
      </div>
    </DrawerFrame>
  )
}

export async function settingsDrawer(_ctx: BeamContext<Env>, _params: Record<string, unknown>): Promise<string> {
  return render(
    <DrawerFrame title="Settings">
      <form beam-action="saveSettings" beam-target="#settings-result" beam-close>
        <div class="form-group">
          <label for="theme">Theme</label>
          <select id="theme" name="theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        <div class="form-group">
          <label for="notifications">
            <input type="checkbox" id="notifications" name="notifications" checked />
            Enable Notifications
          </label>
        </div>
        <div class="drawer-actions">
          <button type="button" beam-close>Cancel</button>
          <button type="submit" class="btn-primary">Save Settings</button>
        </div>
      </form>
    </DrawerFrame>
  )
}
