export * from "./render-admin";
export * from "./live-reload";

export { default as SearchBar } from "./user/SearchBar.svelte";
export { mountOrShowError } from "./mount-utils";

export const HOME_EVENT_NAMES = {
    // The home server notified us about a new revision. We diffed the DOM and applied mutations,
    // trying to keep anything injected by Vite _and_ any mounted svelte components.
    HMR_HAPPENED: "home:hmr-happened",

    // Something was clicked, and we diffed the DOM to navigate to a new page instead of doing a full
    // reload — we kept vite-injected styles etc. but svelte components most likely need to be
    // re-mounted (those that rely on document.querySelectorAll to "enhance" the DOM)
    TURBO_NAVIGATION_HAPPENED: "home:turbo-navigation-happened",
};

export const HOME_SPECIAL_CLASS_NAMES = {
    /// Any node with that class is preserved when applying hot module reload on a page, which means such a node will never be removed from the DOM.
    SURVIVES_HMR: "home-survives-hmr",

    /// Implies "survives_hmr" — Any node with that class is preserved when doing turbo navigation from one page to another.
    SURVIVES_TURBONAV: "home-survives-turbonav",
};
