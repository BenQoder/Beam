// ============ BEAM DEV ERROR OVERLAY ============
// Loaded only in dev builds (`beam build --dev`) via the beam client's
// __BEAM_DEV_REFRESH__ gate — never shipped to production. Paints a
// Vite-style overlay when an action throws on the server
// ('beam:action-error') or a React island crashes ('beam:island-error').
// Dismiss with the × button or Escape; errors stack with a counter.
const OVERLAY_ID = 'beam-dev-overlay';
let errors = [];
function ensureOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay)
        return overlay;
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('style', [
        'position:fixed', 'inset:0', 'z-index:2147483646',
        'background:rgba(10,10,14,0.88)', 'color:#f8fafc',
        'font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace',
        'padding:48px 24px', 'overflow:auto', 'box-sizing:border-box',
    ].join(';'));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay)
            hideOverlay();
    });
    document.body.appendChild(overlay);
    return overlay;
}
function hideOverlay() {
    errors = [];
    document.getElementById(OVERLAY_ID)?.remove();
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function render() {
    if (errors.length === 0)
        return;
    const overlay = ensureOverlay();
    const latest = errors[errors.length - 1];
    overlay.innerHTML = `
    <div style="max-width:860px;margin:0 auto;background:#18181d;border:1px solid #3f3f46;border-radius:8px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#27272e;border-bottom:1px solid #3f3f46">
        <strong style="color:#f87171">beam error</strong>
        <span style="color:#a1a1aa">${escapeHtml(latest.title)}</span>
        ${errors.length > 1 ? `<span style="color:#71717a">(${errors.length} errors — latest shown)</span>` : ''}
        <button id="beam-dev-overlay-close" style="margin-left:auto;background:none;border:1px solid #52525b;border-radius:4px;color:#e4e4e7;cursor:pointer;padding:2px 10px;font:inherit">×</button>
      </div>
      <div style="padding:16px">
        <div style="color:#fca5a5;font-size:15px;margin-bottom:12px;white-space:pre-wrap">${escapeHtml(latest.message)}</div>
        ${latest.stack ? `<pre style="margin:0;color:#a1a1aa;white-space:pre-wrap;word-break:break-word">${escapeHtml(latest.stack)}</pre>` : ''}
        <div style="margin-top:16px;color:#71717a">Esc or × to dismiss · beam.debug(true) in the console traces every call</div>
      </div>
    </div>
  `;
    overlay.querySelector('#beam-dev-overlay-close')?.addEventListener('click', hideOverlay);
}
function pushError(error) {
    errors.push(error);
    render();
}
function start() {
    const marker = globalThis;
    if (marker.__BEAM_DEV_OVERLAY_ACTIVE__)
        return;
    marker.__BEAM_DEV_OVERLAY_ACTIVE__ = true;
    window.addEventListener('beam:action-error', (e) => {
        const detail = e.detail;
        if (!detail)
            return;
        pushError({
            title: detail.action ? `action "${detail.action}"` : 'action failed',
            message: detail.message,
            stack: detail.stack,
        });
    });
    window.addEventListener('beam:island-error', (e) => {
        const detail = e.detail;
        if (!detail)
            return;
        const err = detail.error;
        pushError({
            title: `island "${detail.name ?? '?'}" ${detail.phase === 'load' ? 'failed to load' : 'crashed'}${detail.src ? ` (${detail.src})` : ''}`,
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
        });
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById(OVERLAY_ID))
            hideOverlay();
    });
}
export const __beamDevOverlayInternals = { pushError, hideOverlay, render };
if (typeof document !== 'undefined') {
    start();
}
