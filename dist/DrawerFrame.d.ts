import type { Child } from 'hono/jsx';
type Props = {
    title: string;
    children: Child;
};
/**
 * Reusable drawer wrapper component.
 * Provides consistent header with title and close button.
 *
 * Note: The position (left/right) and size (small/medium/large) are
 * controlled by the client via beam-position and beam-size attributes
 * on the trigger element.
 */
export declare function DrawerFrame({ title, children }: Props): import("hono/jsx/jsx-dev-runtime").JSX.Element;
export {};
//# sourceMappingURL=DrawerFrame.d.ts.map