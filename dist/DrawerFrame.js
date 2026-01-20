import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "hono/jsx/jsx-runtime";
/**
 * Reusable drawer wrapper component.
 * Provides consistent header with title and close button.
 *
 * Note: The position (left/right) and size (small/medium/large) are
 * controlled by the client via beam-position and beam-size attributes
 * on the trigger element.
 */
export function DrawerFrame({ title, children }) {
    return (_jsxs(_Fragment, { children: [_jsxs("header", { class: "drawer-header", children: [_jsx("h2", { children: title }), _jsx("button", { type: "button", "beam-close": true, "aria-label": "Close", class: "drawer-close", children: "\u00D7" })] }), _jsx("div", { class: "drawer-body", children: children })] }));
}
