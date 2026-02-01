// Client-side island registry and utilities
// This file is imported on the client side to manage island components
// Global island registry
const islandRegistry = new Map();
/**
 * Register an island component with a name
 * @param name - The name of the island component (used in beam-island attribute)
 * @param component - The component function
 */
export function registerIsland(name, component) {
    if (islandRegistry.has(name)) {
        console.warn(`[beam-islands] Island "${name}" is already registered. Overwriting.`);
    }
    islandRegistry.set(name, component);
}
/**
 * Define an island component (returns the component for server-side use)
 * This is the main API for creating island components
 * @param name - The name of the island component
 * @param component - The component function
 * @returns The component function (for tree-shaking)
 */
export function defineIsland(name, component) {
    // Register the island in the global registry (client-side only)
    if (typeof window !== 'undefined') {
        registerIsland(name, component);
    }
    return component;
}
/**
 * Parse props from data-* attributes on an element
 * Only supports primitives: string, number, boolean
 */
function parseIslandProps(element) {
    const props = {};
    // Get all data-* attributes except data-beam-hydrated
    for (const attr of Array.from(element.attributes)) {
        if (attr.name.startsWith('data-') && attr.name !== 'data-beam-hydrated') {
            const key = attr.name.slice(5); // Remove 'data-' prefix
            const value = attr.value;
            // Try to parse as number
            const numValue = Number(value);
            if (!isNaN(numValue) && value !== '' && value !== 'true' && value !== 'false') {
                props[key] = numValue;
                continue;
            }
            // Try to parse as boolean
            if (value === 'true') {
                props[key] = true;
                continue;
            }
            if (value === 'false') {
                props[key] = false;
                continue;
            }
            // Default to string
            props[key] = value;
        }
    }
    return props;
}
/**
 * Hydrate a single island element
 */
function hydrateIsland(element) {
    const islandName = element.getAttribute('beam-island');
    if (!islandName)
        return;
    // Check if already hydrated
    if (element.hasAttribute('data-beam-hydrated')) {
        return;
    }
    // Get the island component from registry
    const component = islandRegistry.get(islandName);
    if (!component) {
        console.warn(`[beam-islands] Island component "${islandName}" not found in registry`);
        return;
    }
    // Parse props from data-* attributes
    const props = parseIslandProps(element);
    try {
        // Render the component
        const result = component(props);
        // If the component returns JSX/DOM, replace element content
        if (result) {
            // Check if result has a render method (hono/jsx/dom compatibility)
            if (typeof result === 'object' && 'render' in result && typeof result.render === 'function') {
                element.innerHTML = '';
                element.appendChild(result.render());
            }
            else if (result instanceof Node) {
                element.innerHTML = '';
                element.appendChild(result);
            }
            else if (typeof result === 'string') {
                element.innerHTML = result;
            }
        }
        // Mark as hydrated to prevent re-hydration during morphing
        element.setAttribute('data-beam-hydrated', 'true');
    }
    catch (error) {
        console.error(`[beam-islands] Error hydrating island "${islandName}":`, error);
    }
}
/**
 * Scan the document for island elements and hydrate them
 * @param root - The root element to scan (defaults to document)
 */
export function hydrateIslands(root = document) {
    // Find all elements with beam-island attribute
    const islands = root.querySelectorAll('[beam-island]:not([data-beam-hydrated])');
    islands.forEach((element) => {
        hydrateIsland(element);
    });
}
/**
 * Get the island registry (for debugging)
 */
export function getIslandRegistry() {
    return islandRegistry;
}
// Auto-initialize islands on DOMContentLoaded (if not already loaded)
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            hydrateIslands();
        });
    }
    else {
        // DOM already loaded, hydrate immediately
        hydrateIslands();
    }
}
// Export a function to manually trigger island hydration (for dynamic content)
export { hydrateIslands as scanIslands };
