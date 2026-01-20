import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "hono/jsx/jsx-runtime";
/**
 * Reusable modal wrapper component.
 * Provides consistent header with title and close button.
 */
export function ModalFrame({ title, children }) {
    return (_jsxs(_Fragment, { children: [_jsxs("header", { class: "modal-header", children: [_jsx("h2", { children: title }), _jsx("button", { type: "button", "beam-close": true, "aria-label": "Close", class: "modal-close", children: "\u00D7" })] }), _jsx("div", { class: "modal-body", children: children })] }));
}
