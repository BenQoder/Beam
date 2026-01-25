import { Idiomorph } from 'idiomorph';
import { newWebSocketRpcSession } from 'capnweb';
// ============ BEAM - capnweb RPC Client ============
//
// Uses capnweb for:
// - Promise pipelining (multiple calls in one round-trip)
// - Bidirectional RPC (server can call client callbacks)
// - Automatic reconnection
// - Type-safe method calls
// Get endpoint from meta tag or default to /beam
// Usage: <meta name="beam-endpoint" content="/custom-endpoint">
function getEndpoint() {
    const meta = document.querySelector('meta[name="beam-endpoint"]');
    return meta?.getAttribute('content') ?? '/beam';
}
let isOnline = navigator.onLine;
let rpcSession = null;
let connectingPromise = null;
// Client callback handler for server-initiated updates
function handleServerEvent(event, data) {
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('beam:server-event', { detail: { event, data } }));
    // Built-in handlers
    if (event === 'toast') {
        const { message, type } = data;
        showToast(message, type || 'success');
    }
    else if (event === 'refresh') {
        const { selector } = data;
        // Could trigger a refresh of specific elements
        window.dispatchEvent(new CustomEvent('beam:refresh', { detail: { selector } }));
    }
}
function connect() {
    if (connectingPromise) {
        return connectingPromise;
    }
    if (rpcSession) {
        return Promise.resolve(rpcSession);
    }
    connectingPromise = new Promise((resolve, reject) => {
        try {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const endpoint = getEndpoint();
            const url = `${protocol}//${location.host}${endpoint}`;
            // Create capnweb RPC session with BeamServer type
            const session = newWebSocketRpcSession(url);
            // Register client callback for bidirectional communication
            // @ts-ignore - capnweb stub methods are dynamically typed
            session.registerCallback?.(handleServerEvent)?.catch?.(() => {
                // Server may not support callbacks, that's ok
            });
            rpcSession = session;
            connectingPromise = null;
            resolve(session);
        }
        catch (err) {
            connectingPromise = null;
            reject(err);
        }
    });
    return connectingPromise;
}
async function ensureConnected() {
    if (rpcSession) {
        return rpcSession;
    }
    return connect();
}
/**
 * Execute a script string safely
 */
function executeScript(code) {
    try {
        new Function(code)();
    }
    catch (err) {
        console.error('[beam] Script execution error:', err);
    }
}
// API wrapper that ensures connection before calls
const api = {
    async call(action, data = {}) {
        const session = await ensureConnected();
        // @ts-ignore - capnweb stub methods are dynamically typed
        return session.call(action, data);
    },
    async modal(modalId, params = {}) {
        const session = await ensureConnected();
        // @ts-ignore - capnweb stub methods are dynamically typed
        return session.modal(modalId, params);
    },
    async drawer(drawerId, params = {}) {
        const session = await ensureConnected();
        // @ts-ignore - capnweb stub methods are dynamically typed
        return session.drawer(drawerId, params);
    },
    // Direct access to RPC session for advanced usage (promise pipelining, etc.)
    async getSession() {
        return ensureConnected();
    },
};
// ============ DOM HELPERS ============
let activeModal = null;
let activeDrawer = null;
function $(selector) {
    return document.querySelector(selector);
}
function $$(selector) {
    return document.querySelectorAll(selector);
}
function morph(target, html, options) {
    // Handle beam-keep elements
    const keepSelectors = options?.keepElements || [];
    const keptElements = new Map();
    // Preserve elements marked with beam-keep
    target.querySelectorAll('[beam-keep]').forEach((el) => {
        const id = el.id || `beam-keep-${Math.random().toString(36).slice(2)}`;
        if (!el.id)
            el.id = id;
        const placeholder = document.createComment(`beam-keep:${id}`);
        el.parentNode?.insertBefore(placeholder, el);
        keptElements.set(id, { el, placeholder });
        el.remove();
    });
    // Also handle explicitly specified keep selectors
    keepSelectors.forEach((selector) => {
        target.querySelectorAll(selector).forEach((el) => {
            const id = el.id || `beam-keep-${Math.random().toString(36).slice(2)}`;
            if (!el.id)
                el.id = id;
            if (!keptElements.has(id)) {
                const placeholder = document.createComment(`beam-keep:${id}`);
                el.parentNode?.insertBefore(placeholder, el);
                keptElements.set(id, { el, placeholder });
                el.remove();
            }
        });
    });
    // @ts-ignore - idiomorph types
    Idiomorph.morph(target, html, { morphStyle: 'innerHTML' });
    // Restore kept elements
    keptElements.forEach(({ el, placeholder }, id) => {
        // Find the placeholder or element with same ID in new content
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_COMMENT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.textContent === `beam-keep:${id}`) {
                node.parentNode?.replaceChild(el, node);
                return;
            }
        }
        // If no placeholder, look for element with same ID to replace
        const newEl = target.querySelector(`#${id}`);
        if (newEl) {
            newEl.parentNode?.replaceChild(el, newEl);
        }
    });
}
function getParams(el) {
    // Start with beam-params JSON if present
    const params = JSON.parse(el.getAttribute('beam-params') || '{}');
    // Collect beam-data-* attributes
    for (const attr of el.attributes) {
        if (attr.name.startsWith('beam-data-')) {
            const key = attr.name.slice(10); // remove 'beam-data-'
            // Try to parse as JSON for numbers/booleans, fallback to string
            try {
                params[key] = JSON.parse(attr.value);
            }
            catch {
                params[key] = attr.value;
            }
        }
    }
    return params;
}
// ============ CONFIRMATION DIALOGS ============
// Usage: <button beam-action="delete" beam-confirm="Are you sure?">Delete</button>
// Usage: <button beam-action="delete" beam-confirm.prompt="Type DELETE to confirm|DELETE">Delete</button>
function checkConfirm(el) {
    const confirmMsg = el.getAttribute('beam-confirm');
    if (!confirmMsg)
        return true;
    // Check for .prompt modifier (e.g., beam-confirm.prompt="message|expected")
    if (el.hasAttribute('beam-confirm-prompt')) {
        const [message, expected] = (el.getAttribute('beam-confirm-prompt') || '').split('|');
        const input = prompt(message);
        return input === expected;
    }
    return confirm(confirmMsg);
}
// ============ LOADING INDICATORS ============
// Store active actions with their params: Map<action, Set<paramsJSON>>
const activeActions = new Map();
// Store disabled elements during request
const disabledElements = new Map();
function setLoading(el, loading, action, params) {
    // Loading state on trigger element
    el.toggleAttribute('beam-loading', loading);
    // Handle beam-disable
    if (loading && el.hasAttribute('beam-disable')) {
        const disableSelector = el.getAttribute('beam-disable');
        let elementsToDisable;
        if (!disableSelector || disableSelector === '' || disableSelector === 'true') {
            // Disable the element itself and its children
            elementsToDisable = [el, ...Array.from(el.querySelectorAll('button, input, select, textarea'))];
        }
        else {
            // Disable specific elements by selector
            elementsToDisable = Array.from(document.querySelectorAll(disableSelector));
        }
        const originalStates = elementsToDisable.map((e) => e.disabled || false);
        elementsToDisable.forEach((e) => (e.disabled = true));
        disabledElements.set(el, { elements: elementsToDisable, originalStates });
    }
    else if (!loading && disabledElements.has(el)) {
        // Restore disabled state
        const { elements, originalStates } = disabledElements.get(el);
        elements.forEach((e, i) => (e.disabled = originalStates[i]));
        disabledElements.delete(el);
    }
    // Legacy: disable buttons inside if no beam-disable specified
    if (!el.hasAttribute('beam-disable')) {
        el.querySelectorAll('button, input[type="submit"]').forEach((child) => {
            child.disabled = loading;
        });
    }
    // Set .beam-active class on element during loading
    el.classList.toggle('beam-active', loading);
    // Broadcast to loading indicators
    if (action) {
        const paramsKey = JSON.stringify(params || {});
        if (loading) {
            if (!activeActions.has(action)) {
                activeActions.set(action, new Set());
            }
            activeActions.get(action).add(paramsKey);
        }
        else {
            activeActions.get(action)?.delete(paramsKey);
            if (activeActions.get(action)?.size === 0) {
                activeActions.delete(action);
            }
        }
        updateLoadingIndicators();
    }
}
function getLoadingParams(el) {
    // Start with beam-loading-params JSON if present
    const params = JSON.parse(el.getAttribute('beam-loading-params') || '{}');
    // Collect beam-loading-data-* attributes (override JSON params)
    for (const attr of el.attributes) {
        if (attr.name.startsWith('beam-loading-data-')) {
            const key = attr.name.slice(18); // remove 'beam-loading-data-'
            try {
                params[key] = JSON.parse(attr.value);
            }
            catch {
                params[key] = attr.value;
            }
        }
    }
    return params;
}
function matchesParams(required, activeParamsSet) {
    const requiredKeys = Object.keys(required);
    if (requiredKeys.length === 0)
        return true; // No params required, match any
    for (const paramsJson of activeParamsSet) {
        const params = JSON.parse(paramsJson);
        const matches = requiredKeys.every((key) => String(params[key]) === String(required[key]));
        if (matches)
            return true;
    }
    return false;
}
function updateLoadingIndicators() {
    document.querySelectorAll('[beam-loading-for]').forEach((el) => {
        const targets = el
            .getAttribute('beam-loading-for')
            .split(',')
            .map((s) => s.trim());
        const requiredParams = getLoadingParams(el);
        let isActive = false;
        if (targets.includes('*')) {
            // Match any action
            isActive = activeActions.size > 0;
        }
        else {
            // Match specific action(s) with optional params
            isActive = targets.some((action) => {
                const actionParams = activeActions.get(action);
                return actionParams && matchesParams(requiredParams, actionParams);
            });
        }
        // Show/hide
        if (el.hasAttribute('beam-loading-remove')) {
            el.style.display = isActive ? 'none' : '';
        }
        else if (!el.hasAttribute('beam-loading-class')) {
            el.style.display = isActive ? '' : 'none';
        }
        // Add/remove class
        const loadingClass = el.getAttribute('beam-loading-class');
        if (loadingClass) {
            el.classList.toggle(loadingClass, isActive);
        }
    });
}
// Hide loading indicators by default on page load
document.querySelectorAll('[beam-loading-for]:not([beam-loading-remove]):not([beam-loading-class])').forEach((el) => {
    el.style.display = 'none';
});
function optimistic(el) {
    const template = el.getAttribute('beam-optimistic');
    const targetSelector = el.getAttribute('beam-target');
    let snapshot = null;
    if (template && targetSelector) {
        const targetEl = $(targetSelector);
        if (targetEl) {
            snapshot = targetEl.innerHTML;
            const params = getParams(el);
            const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ''));
            morph(targetEl, html);
        }
    }
    return {
        rollback() {
            if (snapshot && targetSelector) {
                const targetEl = $(targetSelector);
                if (targetEl)
                    morph(targetEl, snapshot);
            }
        },
    };
}
function showPlaceholder(el) {
    const placeholder = el.getAttribute('beam-placeholder');
    const targetSelector = el.getAttribute('beam-target');
    let snapshot = null;
    if (placeholder && targetSelector) {
        const targetEl = $(targetSelector);
        if (targetEl) {
            snapshot = targetEl.innerHTML;
            // Check if placeholder is a selector (starts with # or .)
            if (placeholder.startsWith('#') || placeholder.startsWith('.')) {
                const tpl = document.querySelector(placeholder);
                if (tpl instanceof HTMLTemplateElement) {
                    targetEl.innerHTML = tpl.innerHTML;
                }
                else if (tpl) {
                    targetEl.innerHTML = tpl.innerHTML;
                }
            }
            else {
                targetEl.innerHTML = placeholder;
            }
        }
    }
    return {
        restore() {
            if (snapshot && targetSelector) {
                const targetEl = $(targetSelector);
                if (targetEl)
                    targetEl.innerHTML = snapshot;
            }
        },
    };
}
// ============ SWAP STRATEGIES ============
function swap(target, html, mode, trigger) {
    const { main, oob } = parseOobSwaps(html);
    switch (mode) {
        case 'append':
            trigger?.remove();
            target.insertAdjacentHTML('beforeend', main);
            break;
        case 'prepend':
            trigger?.remove();
            target.insertAdjacentHTML('afterbegin', main);
            break;
        case 'replace':
            target.innerHTML = main;
            break;
        case 'delete':
            target.remove();
            break;
        case 'morph':
        default:
            morph(target, main);
            break;
    }
    // Out-of-band swaps
    for (const { selector, content, swapMode } of oob) {
        const oobTarget = $(selector);
        if (oobTarget) {
            if (swapMode === 'morph' || !swapMode) {
                morph(oobTarget, content);
            }
            else {
                swap(oobTarget, content, swapMode);
            }
        }
    }
    // Process hungry elements - auto-update elements that match IDs in response
    processHungryElements(html);
}
function parseOobSwaps(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const oob = [];
    temp.querySelectorAll('template[beam-touch]').forEach((tpl) => {
        const selector = tpl.getAttribute('beam-touch');
        const swapMode = tpl.getAttribute('beam-swap') || 'morph';
        if (selector) {
            oob.push({ selector, content: tpl.innerHTML, swapMode });
        }
        tpl.remove();
    });
    return { main: temp.innerHTML, oob };
}
// ============ RPC WRAPPER ============
async function rpc(action, data, el) {
    const targetSelector = el.getAttribute('beam-target');
    const swapMode = el.getAttribute('beam-swap') || 'morph';
    const opt = optimistic(el);
    const placeholder = showPlaceholder(el);
    setLoading(el, true, action, data);
    try {
        const response = await api.call(action, data);
        // Handle redirect (if present) - takes priority
        if (response.redirect) {
            location.href = response.redirect;
            return;
        }
        // Handle HTML (if present)
        if (response.html && targetSelector) {
            const target = $(targetSelector);
            if (target) {
                swap(target, response.html, swapMode, el);
            }
        }
        // Execute script (if present)
        if (response.script) {
            executeScript(response.script);
        }
        // Handle history
        handleHistory(el);
    }
    catch (err) {
        opt.rollback();
        placeholder.restore();
        showToast('Something went wrong. Please try again.', 'error');
        console.error('RPC error:', err);
    }
    finally {
        setLoading(el, false, action, data);
    }
}
// ============ HISTORY MANAGEMENT ============
// Usage: <a beam-action="load" beam-push="/new-url">Link</a>
// Usage: <button beam-action="filter" beam-replace="?sort=name">Filter</button>
function handleHistory(el) {
    const pushUrl = el.getAttribute('beam-push');
    const replaceUrl = el.getAttribute('beam-replace');
    if (pushUrl) {
        history.pushState({ beam: true }, '', pushUrl);
    }
    else if (replaceUrl) {
        history.replaceState({ beam: true }, '', replaceUrl);
    }
}
// Handle back/forward navigation
window.addEventListener('popstate', (e) => {
    // Reload page on back/forward for now
    // Could be enhanced to restore content from cache
    if (e.state?.beam) {
        location.reload();
    }
});
// ============ BUTTON HANDLING ============
// Instant click - trigger on mousedown for faster response
document.addEventListener('mousedown', async (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const btn = target.closest('[beam-action][beam-instant]:not(form):not([beam-load-more]):not([beam-infinite])');
    if (!btn || btn.tagName === 'FORM')
        return;
    // Skip if submit button inside a beam form
    if (btn.closest('form[beam-action]') && btn.getAttribute('type') === 'submit')
        return;
    e.preventDefault();
    // Check confirmation
    if (!checkConfirm(btn))
        return;
    const action = btn.getAttribute('beam-action');
    if (!action)
        return;
    const params = getParams(btn);
    await rpc(action, params, btn);
    if (btn.hasAttribute('beam-close')) {
        closeModal();
        closeDrawer();
    }
});
// Regular click handling
document.addEventListener('click', async (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const btn = target.closest('[beam-action]:not(form):not([beam-instant]):not([beam-load-more]):not([beam-infinite])');
    if (!btn || btn.tagName === 'FORM')
        return;
    // Skip if submit button inside a beam form
    if (btn.closest('form[beam-action]') && btn.getAttribute('type') === 'submit')
        return;
    e.preventDefault();
    // Check confirmation
    if (!checkConfirm(btn))
        return;
    const action = btn.getAttribute('beam-action');
    if (!action)
        return;
    const params = getParams(btn);
    await rpc(action, params, btn);
    if (btn.hasAttribute('beam-close')) {
        closeModal();
        closeDrawer();
    }
});
// ============ MODALS ============
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const trigger = target.closest('[beam-modal]');
    if (trigger) {
        e.preventDefault();
        // Check confirmation
        if (!checkConfirm(trigger))
            return;
        const modalId = trigger.getAttribute('beam-modal');
        const params = getParams(trigger);
        if (modalId) {
            openModal(modalId, params);
        }
    }
    // Close on backdrop click
    if (target.matches?.('#modal-backdrop')) {
        closeModal();
    }
    // Close button (handles both modal and drawer)
    const closeBtn = target.closest('[beam-close]');
    if (closeBtn && !closeBtn.hasAttribute('beam-action')) {
        if (activeDrawer) {
            closeDrawer();
        }
        else {
            closeModal();
        }
    }
});
// Drawer triggers
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const trigger = target.closest('[beam-drawer]');
    if (trigger) {
        e.preventDefault();
        // Check confirmation
        if (!checkConfirm(trigger))
            return;
        const drawerId = trigger.getAttribute('beam-drawer');
        const position = trigger.getAttribute('beam-position') || 'right';
        const size = trigger.getAttribute('beam-size') || 'medium';
        const params = getParams(trigger);
        if (drawerId) {
            openDrawer(drawerId, params, { position, size });
        }
    }
    // Close on backdrop click
    if (target.matches?.('#drawer-backdrop')) {
        closeDrawer();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (activeDrawer) {
            closeDrawer();
        }
        else if (activeModal) {
            closeModal();
        }
    }
});
async function openModal(id, params = {}) {
    try {
        const html = await api.modal(id, params);
        let backdrop = $('#modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }
        backdrop.innerHTML = `
      <div id="modal-content" role="dialog" aria-modal="true">
        ${html}
      </div>
    `;
        backdrop.offsetHeight;
        backdrop.classList.add('open');
        document.body.classList.add('modal-open');
        activeModal = $('#modal-content');
        const autoFocus = activeModal?.querySelector('[autofocus]');
        const firstInput = activeModal?.querySelector('input, button, textarea, select');
        (autoFocus || firstInput)?.focus();
    }
    catch (err) {
        showToast('Failed to open modal.', 'error');
        console.error('Modal error:', err);
    }
}
function closeModal() {
    const backdrop = $('#modal-backdrop');
    if (backdrop) {
        backdrop.classList.remove('open');
        setTimeout(() => {
            backdrop.innerHTML = '';
        }, 200);
    }
    document.body.classList.remove('modal-open');
    activeModal = null;
}
async function openDrawer(id, params = {}, options) {
    try {
        const html = await api.drawer(id, params);
        let backdrop = $('#drawer-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'drawer-backdrop';
            document.body.appendChild(backdrop);
        }
        // Set position and size as data attributes for CSS styling
        const { position, size } = options;
        backdrop.innerHTML = `
      <div id="drawer-content" role="dialog" aria-modal="true" data-position="${position}" data-size="${size}">
        ${html}
      </div>
    `;
        backdrop.offsetHeight; // Force reflow
        backdrop.classList.add('open');
        document.body.classList.add('drawer-open');
        activeDrawer = $('#drawer-content');
        const autoFocus = activeDrawer?.querySelector('[autofocus]');
        const firstInput = activeDrawer?.querySelector('input, button, textarea, select');
        (autoFocus || firstInput)?.focus();
    }
    catch (err) {
        showToast('Failed to open drawer.', 'error');
        console.error('Drawer error:', err);
    }
}
function closeDrawer() {
    const backdrop = $('#drawer-backdrop');
    if (backdrop) {
        backdrop.classList.remove('open');
        setTimeout(() => {
            backdrop.innerHTML = '';
        }, 200);
    }
    document.body.classList.remove('drawer-open');
    activeDrawer = null;
}
// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'success') {
    let container = $('#toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
// ============ OFFLINE DETECTION ============
// Usage: <div beam-offline>You are offline</div>
// Usage: <button beam-action="save" beam-offline-disable>Save</button>
function updateOfflineState() {
    isOnline = navigator.onLine;
    // Show/hide offline indicators
    document.querySelectorAll('[beam-offline]').forEach((el) => {
        const showClass = el.getAttribute('beam-offline-class');
        if (showClass) {
            el.classList.toggle(showClass, !isOnline);
        }
        else {
            el.style.display = isOnline ? 'none' : '';
        }
    });
    // Disable/enable elements when offline
    document.querySelectorAll('[beam-offline-disable]').forEach((el) => {
        ;
        el.disabled = !isOnline;
    });
    // Add/remove body class
    document.body.classList.toggle('beam-offline', !isOnline);
}
window.addEventListener('online', updateOfflineState);
window.addEventListener('offline', updateOfflineState);
// Initialize offline state
updateOfflineState();
// ============ NAVIGATION FEEDBACK ============
// Usage: <nav beam-nav><a href="/home">Home</a></nav>
// Links get .beam-current when they match current URL
function updateNavigation() {
    const currentPath = location.pathname;
    const currentUrl = location.href;
    document.querySelectorAll('[beam-nav] a, a[beam-nav]').forEach((link) => {
        const href = link.getAttribute('href');
        if (!href)
            return;
        // Check if link matches current path
        const linkUrl = new URL(href, location.origin);
        const isExact = linkUrl.pathname === currentPath;
        const isPartial = currentPath.startsWith(linkUrl.pathname) && linkUrl.pathname !== '/';
        // Exact match or partial match (for section highlighting)
        const isCurrent = link.hasAttribute('beam-nav-exact') ? isExact : isExact || isPartial;
        link.classList.toggle('beam-current', isCurrent);
        if (isCurrent) {
            link.setAttribute('aria-current', 'page');
        }
        else {
            link.removeAttribute('aria-current');
        }
    });
}
// Update navigation on page load and history changes
updateNavigation();
window.addEventListener('popstate', updateNavigation);
// ============ CONDITIONAL SHOW/HIDE (beam-switch) ============
// Usage: <select name="type" beam-switch=".type-options">
//          <option value="a">A</option>
//          <option value="b">B</option>
//        </select>
//        <div class="type-options" beam-show-for="a">Options for A</div>
//        <div class="type-options" beam-show-for="b">Options for B</div>
function setupSwitch(el) {
    const targetSelector = el.getAttribute('beam-switch');
    const event = el.getAttribute('beam-switch-event') || 'input';
    const updateTargets = () => {
        const value = el.value;
        // Find targets within the switch region or document
        const region = el.closest('[beam-switch-region]') || el.closest('form') || document;
        region.querySelectorAll(targetSelector).forEach((target) => {
            const showFor = target.getAttribute('beam-show-for');
            const hideFor = target.getAttribute('beam-hide-for');
            const enableFor = target.getAttribute('beam-enable-for');
            const disableFor = target.getAttribute('beam-disable-for');
            // Handle show/hide
            if (showFor !== null) {
                const values = showFor.split(',').map((v) => v.trim());
                const shouldShow = values.includes(value) || (showFor === '' && value !== '');
                target.style.display = shouldShow ? '' : 'none';
            }
            if (hideFor !== null) {
                const values = hideFor.split(',').map((v) => v.trim());
                const shouldHide = values.includes(value);
                target.style.display = shouldHide ? 'none' : '';
            }
            // Handle enable/disable
            if (enableFor !== null) {
                const values = enableFor.split(',').map((v) => v.trim());
                const shouldEnable = values.includes(value);
                target.disabled = !shouldEnable;
            }
            if (disableFor !== null) {
                const values = disableFor.split(',').map((v) => v.trim());
                const shouldDisable = values.includes(value);
                target.disabled = shouldDisable;
            }
        });
    };
    el.addEventListener(event, updateTargets);
    // Initial state
    updateTargets();
}
// Observe switch elements
const switchObserver = new MutationObserver(() => {
    document.querySelectorAll('[beam-switch]:not([beam-switch-observed])').forEach((el) => {
        el.setAttribute('beam-switch-observed', '');
        setupSwitch(el);
    });
});
switchObserver.observe(document.body, { childList: true, subtree: true });
// Initialize existing switch elements
document.querySelectorAll('[beam-switch]').forEach((el) => {
    el.setAttribute('beam-switch-observed', '');
    setupSwitch(el);
});
// ============ AUTO-SUBMIT FORMS ============
// Usage: <form beam-action="filter" beam-autosubmit beam-debounce="300">
function setupAutosubmit(form) {
    const debounce = parseInt(form.getAttribute('beam-debounce') || '300', 10);
    const event = form.getAttribute('beam-autosubmit-event') || 'input';
    let timeout;
    const submitForm = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }, debounce);
    };
    form.querySelectorAll('input, select, textarea').forEach((input) => {
        input.addEventListener(event, submitForm);
        // Also listen to change for selects and checkboxes
        if (input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'radio') {
            input.addEventListener('change', submitForm);
        }
    });
}
// Observe autosubmit forms
const autosubmitObserver = new MutationObserver(() => {
    document.querySelectorAll('form[beam-autosubmit]:not([beam-autosubmit-observed])').forEach((form) => {
        form.setAttribute('beam-autosubmit-observed', '');
        setupAutosubmit(form);
    });
});
autosubmitObserver.observe(document.body, { childList: true, subtree: true });
// Initialize existing autosubmit forms
document.querySelectorAll('form[beam-autosubmit]').forEach((form) => {
    form.setAttribute('beam-autosubmit-observed', '');
    setupAutosubmit(form);
});
// ============ BOOST LINKS ============
// Usage: <main beam-boost>...all links become AJAX...</main>
// Usage: <a href="/page" beam-boost>Single boosted link</a>
document.addEventListener('click', async (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    // Check if click is on a link within a boosted container or a boosted link itself
    const link = target.closest('a[href]');
    if (!link)
        return;
    const isBoosted = link.hasAttribute('beam-boost') || link.closest('[beam-boost]');
    if (!isBoosted)
        return;
    // Skip if explicitly not boosted
    if (link.hasAttribute('beam-boost-off'))
        return;
    // Skip external links
    if (link.host !== location.host)
        return;
    // Skip if modifier keys or non-left click
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
        return;
    // Skip if target="_blank"
    if (link.target === '_blank')
        return;
    // Skip if download link
    if (link.hasAttribute('download'))
        return;
    e.preventDefault();
    // Check confirmation
    if (!checkConfirm(link))
        return;
    const href = link.href;
    const targetSelector = link.getAttribute('beam-target') || 'body';
    const swapMode = link.getAttribute('beam-swap') || 'morph';
    // Show placeholder if specified
    const placeholder = showPlaceholder(link);
    link.classList.add('beam-active');
    try {
        // Fetch the page
        const response = await fetch(href, {
            headers: { 'X-Beam-Boost': 'true' },
        });
        const html = await response.text();
        // Parse response and extract target content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Get content from target selector
        const sourceEl = doc.querySelector(targetSelector);
        if (sourceEl) {
            const target = $(targetSelector);
            if (target) {
                swap(target, sourceEl.innerHTML, swapMode);
            }
        }
        // Update title
        const title = doc.querySelector('title');
        if (title) {
            document.title = title.textContent || '';
        }
        // Push to history
        if (!link.hasAttribute('beam-replace')) {
            history.pushState({ beam: true, url: href }, '', href);
        }
        else {
            history.replaceState({ beam: true, url: href }, '', href);
        }
        // Update navigation state
        updateNavigation();
    }
    catch (err) {
        placeholder.restore();
        // Fallback to normal navigation
        console.error('Boost error, falling back to navigation:', err);
        location.href = href;
    }
    finally {
        link.classList.remove('beam-active');
    }
});
const SCROLL_STATE_KEY_PREFIX = 'beam_scroll_';
const SCROLL_STATE_TTL = 5 * 60 * 1000; // 5 minutes
function getScrollStateKey(action) {
    return SCROLL_STATE_KEY_PREFIX + location.pathname + location.search + '_' + action;
}
function saveScrollState(targetSelector, action) {
    const target = $(targetSelector);
    if (!target)
        return;
    const state = {
        html: target.innerHTML,
        scrollY: window.scrollY,
        timestamp: Date.now(),
    };
    try {
        sessionStorage.setItem(getScrollStateKey(action), JSON.stringify(state));
    }
    catch (e) {
        // sessionStorage might be full or disabled
        console.warn('[beam] Could not save scroll state:', e);
    }
}
function restoreScrollState() {
    // Find infinite scroll or load more container
    const sentinel = document.querySelector('[beam-infinite], [beam-load-more]');
    if (!sentinel)
        return false;
    const action = sentinel.getAttribute('beam-action');
    const targetSelector = sentinel.getAttribute('beam-target');
    if (!action || !targetSelector)
        return false;
    const key = getScrollStateKey(action);
    const stored = sessionStorage.getItem(key);
    if (!stored)
        return false;
    try {
        const state = JSON.parse(stored);
        // Check if state is expired
        if (Date.now() - state.timestamp > SCROLL_STATE_TTL) {
            sessionStorage.removeItem(key);
            return false;
        }
        const target = $(targetSelector);
        if (!target)
            return false;
        // Disable browser's automatic scroll restoration
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        // Capture fresh server-rendered content before replacing
        const freshHtml = target.innerHTML;
        const freshContainer = document.createElement('div');
        freshContainer.innerHTML = freshHtml;
        // Hide content before restoring to prevent jump
        target.style.opacity = '0';
        target.style.transition = 'opacity 0.15s ease-out';
        // Restore cached content (has all pages)
        target.innerHTML = state.html;
        // Morph fresh server data over cached data (server takes precedence)
        // Match elements by beam-item-id attribute
        freshContainer.querySelectorAll('[beam-item-id]').forEach((freshEl) => {
            const itemId = freshEl.getAttribute('beam-item-id');
            const cachedEl = target.querySelector(`[beam-item-id="${itemId}"]`);
            if (cachedEl) {
                morph(cachedEl, freshEl.outerHTML);
            }
        });
        // Also match by id attribute as fallback
        freshContainer.querySelectorAll('[id]').forEach((freshEl) => {
            const cachedEl = target.querySelector(`#${freshEl.id}`);
            if (cachedEl && !freshEl.hasAttribute('beam-item-id')) {
                morph(cachedEl, freshEl.outerHTML);
            }
        });
        // Restore scroll position and fade in
        requestAnimationFrame(() => {
            window.scrollTo(0, state.scrollY);
            requestAnimationFrame(() => {
                target.style.opacity = '1';
            });
        });
        // Re-observe any new sentinels in restored content
        target.querySelectorAll('[beam-infinite]:not([beam-observed])').forEach((el) => {
            el.setAttribute('beam-observed', '');
            infiniteObserver.observe(el);
        });
        // Don't clear state here - it persists until refresh or new content is loaded
        // State is cleared in tryRestoreScrollState() when navType is not 'back_forward'
        return true;
    }
    catch (e) {
        console.warn('[beam] Could not restore scroll state:', e);
        sessionStorage.removeItem(key);
        return false;
    }
}
// Save scroll position when navigating away (for back button restoration)
window.addEventListener('pagehide', () => {
    // Find any infinite scroll or load more element to get the target and action
    const sentinel = document.querySelector('[beam-infinite], [beam-load-more]');
    if (!sentinel)
        return;
    const action = sentinel.getAttribute('beam-action');
    const targetSelector = sentinel.getAttribute('beam-target');
    if (!action || !targetSelector)
        return;
    // Update the saved state with current scroll position
    const key = getScrollStateKey(action);
    const stored = sessionStorage.getItem(key);
    if (!stored)
        return;
    try {
        const state = JSON.parse(stored);
        state.scrollY = window.scrollY;
        state.timestamp = Date.now();
        sessionStorage.setItem(key, JSON.stringify(state));
    }
    catch (e) {
        // Ignore errors
    }
});
// Track the target selector for saving state
let infiniteScrollTarget = null;
const infiniteObserver = new IntersectionObserver(async (entries) => {
    for (const entry of entries) {
        if (!entry.isIntersecting)
            continue;
        const sentinel = entry.target;
        if (sentinel.hasAttribute('beam-loading'))
            continue;
        const action = sentinel.getAttribute('beam-action');
        const targetSelector = sentinel.getAttribute('beam-target');
        const swapMode = sentinel.getAttribute('beam-swap') || 'append';
        if (!action || !targetSelector)
            continue;
        // Track target for state saving
        infiniteScrollTarget = targetSelector;
        // Check confirmation
        if (!checkConfirm(sentinel))
            continue;
        const params = getParams(sentinel);
        sentinel.setAttribute('beam-loading', '');
        sentinel.classList.add('loading');
        setLoading(sentinel, true, action, params);
        try {
            const response = await api.call(action, params);
            const target = $(targetSelector);
            if (target && response.html) {
                swap(target, response.html, swapMode, sentinel);
                // Save scroll state after content is loaded
                requestAnimationFrame(() => {
                    saveScrollState(targetSelector, action);
                });
            }
            // Execute script if present
            if (response.script) {
                executeScript(response.script);
            }
        }
        catch (err) {
            console.error('Infinite scroll error:', err);
            sentinel.removeAttribute('beam-loading');
            sentinel.classList.remove('loading');
            sentinel.classList.add('error');
        }
        finally {
            setLoading(sentinel, false, action, params);
        }
    }
}, { rootMargin: '200px' });
// Observe sentinels (now and future)
new MutationObserver(() => {
    document.querySelectorAll('[beam-infinite]:not([beam-observed])').forEach((el) => {
        el.setAttribute('beam-observed', '');
        infiniteObserver.observe(el);
    });
}).observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('[beam-infinite]').forEach((el) => {
    el.setAttribute('beam-observed', '');
    infiniteObserver.observe(el);
});
// ============ LOAD MORE (Click-based) ============
// Usage: <button beam-load-more beam-action="loadMore" beam-params='{"page":2}' beam-target="#list">Load More</button>
document.addEventListener('click', async (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const trigger = target.closest('[beam-load-more]');
    if (!trigger)
        return;
    e.preventDefault();
    if (trigger.hasAttribute('beam-loading'))
        return;
    const action = trigger.getAttribute('beam-action');
    const targetSelector = trigger.getAttribute('beam-target');
    const swapMode = trigger.getAttribute('beam-swap') || 'append';
    if (!action || !targetSelector)
        return;
    // Check confirmation
    if (!checkConfirm(trigger))
        return;
    const params = getParams(trigger);
    trigger.setAttribute('beam-loading', '');
    trigger.classList.add('loading');
    setLoading(trigger, true, action, params);
    try {
        const response = await api.call(action, params);
        const targetEl = $(targetSelector);
        if (targetEl && response.html) {
            swap(targetEl, response.html, swapMode, trigger);
            // Save scroll state after content is loaded
            requestAnimationFrame(() => {
                saveScrollState(targetSelector, action);
            });
        }
        // Execute script if present
        if (response.script) {
            executeScript(response.script);
        }
        // Handle history
        handleHistory(trigger);
    }
    catch (err) {
        console.error('Load more error:', err);
        trigger.removeAttribute('beam-loading');
        trigger.classList.remove('loading');
        trigger.classList.add('error');
        showToast('Failed to load more. Please try again.', 'error');
    }
    finally {
        setLoading(trigger, false, action, params);
    }
});
// Restore scroll state on page load (for back navigation only, not refresh)
function tryRestoreScrollState() {
    // Only restore on back/forward navigation, not on refresh or direct navigation
    const navEntry = performance.getEntriesByType('navigation')[0];
    const navType = navEntry?.type;
    // 'back_forward' = back/forward button, 'reload' = refresh, 'navigate' = direct navigation
    if (navType !== 'back_forward') {
        // Clear scroll state on refresh or direct navigation
        clearScrollState();
        // Disable browser's automatic scroll restoration and scroll to top
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
        return;
    }
    if (document.querySelector('[beam-infinite], [beam-load-more]')) {
        restoreScrollState();
    }
}
// Restore scroll state when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryRestoreScrollState);
}
else {
    tryRestoreScrollState();
}
const cache = new Map();
const preloading = new Set();
function getCacheKey(action, params) {
    return `${action}:${JSON.stringify(params)}`;
}
function parseCacheDuration(duration) {
    const match = duration.match(/^(\d+)(s|m|h)?$/);
    if (!match)
        return 0;
    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';
    switch (unit) {
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        default:
            return value * 1000;
    }
}
async function fetchWithCache(action, params, cacheDuration) {
    const key = getCacheKey(action, params);
    // Check cache
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
        return cached.response;
    }
    // Fetch fresh
    const response = await api.call(action, params);
    // Store in cache if duration specified
    if (cacheDuration) {
        const duration = parseCacheDuration(cacheDuration);
        if (duration > 0) {
            cache.set(key, { response, expires: Date.now() + duration });
        }
    }
    return response;
}
async function preload(el) {
    const action = el.getAttribute('beam-action');
    if (!action)
        return;
    const params = getParams(el);
    const key = getCacheKey(action, params);
    // Skip if already cached or preloading
    if (cache.has(key) || preloading.has(key))
        return;
    preloading.add(key);
    try {
        const response = await api.call(action, params);
        // Cache for 30 seconds by default for preloaded content
        cache.set(key, { response, expires: Date.now() + 30000 });
    }
    catch {
        // Silently fail preload
    }
    finally {
        preloading.delete(key);
    }
}
// Preload on hover
document.addEventListener('mouseenter', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const el = target.closest('[beam-preload][beam-action]');
    if (el) {
        preload(el);
    }
}, true);
// Preload on touchstart for mobile
document.addEventListener('touchstart', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const el = target.closest('[beam-preload][beam-action]');
    if (el) {
        preload(el);
    }
}, { passive: true });
// Clear cache utility
function clearCache(action) {
    if (action) {
        for (const key of cache.keys()) {
            if (key.startsWith(action + ':')) {
                cache.delete(key);
            }
        }
    }
    else {
        cache.clear();
    }
}
// ============ PROGRESSIVE ENHANCEMENT ============
// Links with href fallback to full page navigation if JS fails
// Usage: <a href="/products/1" beam-action="getProduct" beam-target="#main">View</a>
document.addEventListener('click', async (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const link = target.closest('a[beam-action][href]:not([beam-instant])');
    if (!link)
        return;
    // Let normal navigation happen if:
    // - Meta/Ctrl key held (new tab)
    // - Middle click
    // - Link has target="_blank"
    if (e.metaKey || e.ctrlKey || e.button !== 0 || link.target === '_blank')
        return;
    e.preventDefault();
    // Check confirmation
    if (!checkConfirm(link))
        return;
    const action = link.getAttribute('beam-action');
    if (!action)
        return;
    const params = getParams(link);
    const cacheDuration = link.getAttribute('beam-cache');
    // Use cached result if available
    const key = getCacheKey(action, params);
    const cached = cache.get(key);
    const targetSelector = link.getAttribute('beam-target');
    const swapMode = link.getAttribute('beam-swap') || 'morph';
    // Show placeholder
    const placeholder = showPlaceholder(link);
    setLoading(link, true, action, params);
    try {
        const response = cached && cached.expires > Date.now() ? cached.response : await fetchWithCache(action, params, cacheDuration || undefined);
        // Handle redirect (if present) - takes priority
        if (response.redirect) {
            location.href = response.redirect;
            return;
        }
        // Handle HTML (if present)
        if (response.html && targetSelector) {
            const target = $(targetSelector);
            if (target) {
                swap(target, response.html, swapMode, link);
            }
        }
        // Execute script (if present)
        if (response.script) {
            executeScript(response.script);
        }
        // Handle history
        handleHistory(link);
        // Update navigation
        updateNavigation();
    }
    catch (err) {
        placeholder.restore();
        // Fallback to normal navigation on error
        console.error('Beam link error, falling back to navigation:', err);
        location.href = link.href;
    }
    finally {
        setLoading(link, false, action, params);
    }
}, true);
// ============ FORM HANDLING ============
// Pure RPC forms - no traditional POST
// Usage: <form beam-action="createProduct" beam-target="#result">
document.addEventListener('submit', async (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const form = target.closest('form[beam-action]');
    if (!form)
        return;
    e.preventDefault();
    // Check confirmation
    if (!checkConfirm(form))
        return;
    const action = form.getAttribute('beam-action');
    if (!action)
        return;
    const data = Object.fromEntries(new FormData(form));
    const targetSelector = form.getAttribute('beam-target');
    const swapMode = form.getAttribute('beam-swap') || 'morph';
    // Show placeholder
    const placeholder = showPlaceholder(form);
    setLoading(form, true, action, data);
    try {
        const response = await api.call(action, data);
        // Handle redirect (if present) - takes priority
        if (response.redirect) {
            location.href = response.redirect;
            return;
        }
        // Handle HTML (if present)
        if (response.html && targetSelector) {
            const target = $(targetSelector);
            if (target) {
                swap(target, response.html, swapMode);
            }
        }
        // Execute script (if present)
        if (response.script) {
            executeScript(response.script);
        }
        if (form.hasAttribute('beam-reset')) {
            form.reset();
        }
        if (form.hasAttribute('beam-close')) {
            closeModal();
        }
        // Handle history
        handleHistory(form);
    }
    catch (err) {
        placeholder.restore();
        console.error('Beam form error:', err);
        showToast('Something went wrong. Please try again.', 'error');
    }
    finally {
        setLoading(form, false, action, data);
    }
});
// ============ REAL-TIME VALIDATION ============
// Usage: <input name="email" beam-validate="#email-errors" beam-watch="input" beam-debounce="300">
function setupValidation(el) {
    const event = el.getAttribute('beam-watch') || 'change';
    const debounce = parseInt(el.getAttribute('beam-debounce') || '300', 10);
    const targetSelector = el.getAttribute('beam-validate');
    let timeout;
    el.addEventListener(event, () => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            const form = el.closest('form');
            if (!form)
                return;
            const action = form.getAttribute('beam-action');
            if (!action)
                return;
            const fieldName = el.getAttribute('name');
            if (!fieldName)
                return;
            const formData = Object.fromEntries(new FormData(form));
            const data = { ...formData, _validate: fieldName };
            try {
                const response = await api.call(action, data);
                if (response.html) {
                    const target = $(targetSelector);
                    if (target) {
                        morph(target, response.html);
                    }
                }
                // Execute script (if present)
                if (response.script) {
                    executeScript(response.script);
                }
            }
            catch (err) {
                console.error('Validation error:', err);
            }
        }, debounce);
    });
}
// Observe validation elements (current and future)
const validationObserver = new MutationObserver(() => {
    document.querySelectorAll('[beam-validate]:not([beam-validation-observed])').forEach((el) => {
        el.setAttribute('beam-validation-observed', '');
        setupValidation(el);
    });
});
validationObserver.observe(document.body, { childList: true, subtree: true });
// Initialize existing validation elements
document.querySelectorAll('[beam-validate]').forEach((el) => {
    el.setAttribute('beam-validation-observed', '');
    setupValidation(el);
});
// ============ DEFERRED LOADING ============
// Usage: <div beam-defer beam-action="loadComments" beam-target="#comments">Loading...</div>
const deferObserver = new IntersectionObserver(async (entries) => {
    for (const entry of entries) {
        if (!entry.isIntersecting)
            continue;
        const el = entry.target;
        if (el.hasAttribute('beam-defer-loaded'))
            continue;
        el.setAttribute('beam-defer-loaded', '');
        deferObserver.unobserve(el);
        const action = el.getAttribute('beam-action');
        if (!action)
            continue;
        const params = getParams(el);
        const targetSelector = el.getAttribute('beam-target');
        const swapMode = el.getAttribute('beam-swap') || 'morph';
        setLoading(el, true, action, params);
        try {
            const response = await api.call(action, params);
            if (response.html) {
                const target = targetSelector ? $(targetSelector) : el;
                if (target) {
                    swap(target, response.html, swapMode);
                }
            }
            // Execute script (if present)
            if (response.script) {
                executeScript(response.script);
            }
        }
        catch (err) {
            console.error('Defer error:', err);
        }
        finally {
            setLoading(el, false, action, params);
        }
    }
}, { rootMargin: '100px' });
// Observe defer elements (current and future)
const deferMutationObserver = new MutationObserver(() => {
    document.querySelectorAll('[beam-defer]:not([beam-defer-observed])').forEach((el) => {
        el.setAttribute('beam-defer-observed', '');
        deferObserver.observe(el);
    });
});
deferMutationObserver.observe(document.body, { childList: true, subtree: true });
// Initialize existing defer elements
document.querySelectorAll('[beam-defer]').forEach((el) => {
    el.setAttribute('beam-defer-observed', '');
    deferObserver.observe(el);
});
// ============ POLLING ============
// Usage: <div beam-poll beam-interval="5000" beam-action="getStatus" beam-target="#status">...</div>
const pollingElements = new Map();
function startPolling(el) {
    if (pollingElements.has(el))
        return;
    const interval = parseInt(el.getAttribute('beam-interval') || '5000', 10);
    const action = el.getAttribute('beam-action');
    if (!action)
        return;
    const poll = async () => {
        // Stop if element is no longer in DOM
        if (!document.body.contains(el)) {
            stopPolling(el);
            return;
        }
        // Skip if offline
        if (!isOnline)
            return;
        const params = getParams(el);
        const targetSelector = el.getAttribute('beam-target');
        const swapMode = el.getAttribute('beam-swap') || 'morph';
        try {
            const response = await api.call(action, params);
            if (response.html) {
                const target = targetSelector ? $(targetSelector) : el;
                if (target) {
                    swap(target, response.html, swapMode);
                }
            }
            // Execute script (if present)
            if (response.script) {
                executeScript(response.script);
            }
        }
        catch (err) {
            console.error('Poll error:', err);
        }
    };
    const timerId = setInterval(poll, interval);
    pollingElements.set(el, timerId);
    // Initial poll immediately (unless beam-poll-delay is set)
    if (!el.hasAttribute('beam-poll-delay')) {
        poll();
    }
}
function stopPolling(el) {
    const timerId = pollingElements.get(el);
    if (timerId) {
        clearInterval(timerId);
        pollingElements.delete(el);
    }
}
// Observe polling elements (current and future)
const pollMutationObserver = new MutationObserver(() => {
    document.querySelectorAll('[beam-poll]:not([beam-poll-observed])').forEach((el) => {
        el.setAttribute('beam-poll-observed', '');
        startPolling(el);
    });
});
pollMutationObserver.observe(document.body, { childList: true, subtree: true });
// Initialize existing polling elements
document.querySelectorAll('[beam-poll]').forEach((el) => {
    el.setAttribute('beam-poll-observed', '');
    startPolling(el);
});
// ============ HUNGRY AUTO-REFRESH ============
// Usage: <span id="cart-count" beam-hungry>0</span>
// When any RPC response contains an element with id="cart-count", it auto-updates
function processHungryElements(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Find hungry elements on the page
    document.querySelectorAll('[beam-hungry]').forEach((hungry) => {
        const id = hungry.id;
        if (!id)
            return;
        // Look for matching element in response
        const fresh = temp.querySelector(`#${id}`);
        if (fresh) {
            morph(hungry, fresh.innerHTML);
        }
    });
}
// ============ CLIENT-SIDE UI STATE (Alpine.js Replacement) ============
// Toggle, dropdown, collapse utilities that don't require server round-trips
// === TOGGLE ===
// Usage: <button beam-toggle="#menu">Menu</button>
//        <div id="menu" beam-hidden>Content</div>
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const trigger = target.closest('[beam-toggle]');
    if (trigger) {
        e.preventDefault();
        const selector = trigger.getAttribute('beam-toggle');
        const targetEl = document.querySelector(selector);
        if (targetEl) {
            const isHidden = targetEl.hasAttribute('beam-hidden');
            if (isHidden) {
                targetEl.removeAttribute('beam-hidden');
                trigger.setAttribute('aria-expanded', 'true');
                // Handle transition
                if (targetEl.hasAttribute('beam-transition')) {
                    targetEl.style.display = '';
                    // Force reflow for transition
                    targetEl.offsetHeight;
                }
            }
            else {
                targetEl.setAttribute('beam-hidden', '');
                trigger.setAttribute('aria-expanded', 'false');
            }
        }
    }
});
// === DROPDOWN (with outside-click auto-close) ===
// Usage: <div beam-dropdown>
//          <button beam-dropdown-trigger>Account ▼</button>
//          <div beam-dropdown-content beam-hidden>
//            <a href="/profile">Profile</a>
//          </div>
//        </div>
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const trigger = target.closest('[beam-dropdown-trigger]');
    if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = trigger.closest('[beam-dropdown]');
        const content = dropdown?.querySelector('[beam-dropdown-content]');
        if (content) {
            const isHidden = content.hasAttribute('beam-hidden');
            // Close all other dropdowns first
            document.querySelectorAll('[beam-dropdown-content]:not([beam-hidden])').forEach((el) => {
                if (el !== content) {
                    el.setAttribute('beam-hidden', '');
                    el.closest('[beam-dropdown]')?.querySelector('[beam-dropdown-trigger]')?.setAttribute('aria-expanded', 'false');
                }
            });
            // Toggle this dropdown
            if (isHidden) {
                content.removeAttribute('beam-hidden');
                trigger.setAttribute('aria-expanded', 'true');
            }
            else {
                content.setAttribute('beam-hidden', '');
                trigger.setAttribute('aria-expanded', 'false');
            }
        }
        return;
    }
    // Close all dropdowns on outside click (if click is not inside a dropdown content)
    if (!target.closest('[beam-dropdown-content]')) {
        document.querySelectorAll('[beam-dropdown-content]:not([beam-hidden])').forEach((el) => {
            el.setAttribute('beam-hidden', '');
            el.closest('[beam-dropdown]')?.querySelector('[beam-dropdown-trigger]')?.setAttribute('aria-expanded', 'false');
        });
    }
});
// Close dropdowns on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('[beam-dropdown-content]:not([beam-hidden])').forEach((el) => {
            el.setAttribute('beam-hidden', '');
            el.closest('[beam-dropdown]')?.querySelector('[beam-dropdown-trigger]')?.setAttribute('aria-expanded', 'false');
        });
    }
});
// === COLLAPSE with text swap ===
// Usage: <button beam-collapse="#details" beam-collapse-text="Show less">Show more</button>
//        <div id="details" beam-collapsed>Expanded content...</div>
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const trigger = target.closest('[beam-collapse]');
    if (trigger) {
        e.preventDefault();
        const selector = trigger.getAttribute('beam-collapse');
        const targetEl = document.querySelector(selector);
        if (targetEl) {
            const isCollapsed = targetEl.hasAttribute('beam-collapsed');
            if (isCollapsed) {
                targetEl.removeAttribute('beam-collapsed');
                trigger.setAttribute('aria-expanded', 'true');
            }
            else {
                targetEl.setAttribute('beam-collapsed', '');
                trigger.setAttribute('aria-expanded', 'false');
            }
            // Swap button text if beam-collapse-text is specified
            const altText = trigger.getAttribute('beam-collapse-text');
            if (altText) {
                const currentText = trigger.textContent || '';
                trigger.textContent = altText;
                trigger.setAttribute('beam-collapse-text', currentText);
            }
        }
    }
});
// === CLASS TOGGLE ===
// Usage: <button beam-class-toggle="active" beam-class-target="#sidebar">Toggle</button>
// Or toggle on self: <button beam-class-toggle="active">Toggle</button>
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target?.closest)
        return;
    const trigger = target.closest('[beam-class-toggle]');
    if (trigger) {
        const className = trigger.getAttribute('beam-class-toggle');
        const targetSelector = trigger.getAttribute('beam-class-target');
        const targetEl = targetSelector ? document.querySelector(targetSelector) : trigger;
        if (targetEl && className) {
            targetEl.classList.toggle(className);
        }
    }
});
// Clear scroll state for current page or all pages
// Usage: clearScrollState() - clear all for current URL
//        clearScrollState('loadMore') - clear specific action
//        clearScrollState(true) - clear all scroll states
function clearScrollState(actionOrAll) {
    if (actionOrAll === true) {
        // Clear all scroll states
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(SCROLL_STATE_KEY_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    }
    else if (typeof actionOrAll === 'string') {
        // Clear specific action's scroll state
        sessionStorage.removeItem(getScrollStateKey(actionOrAll));
    }
    else {
        // Clear all scroll states for current URL (any action)
        const prefix = SCROLL_STATE_KEY_PREFIX + location.pathname + location.search;
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    }
}
// Base utilities that are always available on window.beam
const beamUtils = {
    showToast,
    closeModal,
    closeDrawer,
    clearCache,
    clearScrollState,
    isOnline: () => isOnline,
    getSession: api.getSession,
};
// Create a Proxy that handles both utility methods and dynamic action calls
window.beam = new Proxy(beamUtils, {
    get(target, prop) {
        // Return existing utility methods
        if (prop in target) {
            return target[prop];
        }
        // Return a dynamic action caller for any other property
        return async (data = {}, options) => {
            const rawResponse = await api.call(prop, data);
            // Normalize response: string -> {html: string}, object -> as-is
            const response = typeof rawResponse === 'string'
                ? { html: rawResponse }
                : rawResponse;
            // Handle redirect (takes priority)
            if (response.redirect) {
                location.href = response.redirect;
                return response;
            }
            // Normalize options: string is shorthand for { target: string }
            const opts = typeof options === 'string'
                ? { target: options }
                : (options || {});
            // Handle HTML swap if target provided
            if (response.html && opts.target) {
                const targetEl = document.querySelector(opts.target);
                if (targetEl) {
                    swap(targetEl, response.html, opts.swap || 'morph');
                }
            }
            // Execute script if present
            if (response.script) {
                executeScript(response.script);
            }
            return response;
        };
    }
});
window.showToast = showToast;
window.closeModal = closeModal;
window.closeDrawer = closeDrawer;
window.clearCache = clearCache;
// Initialize capnweb RPC connection
connect().catch(console.error);
