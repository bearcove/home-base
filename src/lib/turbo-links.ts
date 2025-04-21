// Simulates Turbolinks behavior: intercepts relative link clicks, updates content without full page reloads,
// manages browser history, and handles back/forward navigation for faster, smoother page transitions.
//
// Code style: Always use brackets for if and else blocks, no single line ifs
import { HOME_EVENT_NAMES, HOME_SPECIAL_CLASS_NAMES } from ".";
import { home } from "./log";
import diff from "./diff-dom-streaming";
import debug from "debug";

const log = debug("turbolinks");

export interface TurboNavigateOptions {
    url: string;
    hmr: boolean;
    scrollToTop: boolean;
}

export async function applyDiff(opts: TurboNavigateOptions) {
    try {
        const response = await fetch(opts.url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
            throw new Error("Response body is null");
        }
        const bodyText = await response.text();
        diff(document, bodyText, {
            shouldPreserveNode: (node) => {
                if (node instanceof Element) {
                    if (opts.hmr) {
                        if (node.classList.contains("random")) {
                            log(
                                "Doing HMR: preserving node with 'random' class to avoid layout shifts",
                                node,
                            );
                            return true;
                        }
                        if (node.classList.contains(HOME_SPECIAL_CLASS_NAMES.SURVIVES_HMR)) {
                            log(
                                `Doing HMR: preserving node with '${HOME_SPECIAL_CLASS_NAMES.SURVIVES_HMR}' class`,
                                node,
                            );
                            return true;
                        }
                    }
                    if (node.hasAttribute("data-vite-dev-id")) {
                        log(
                            "Preserving node with 'data-vite-dev-id' attribute for Vite development",
                            node,
                        );
                        return true;
                    }
                    if (node.classList.contains(HOME_SPECIAL_CLASS_NAMES.SURVIVES_TURBONAV)) {
                        log(
                            `Preserving node with '${HOME_SPECIAL_CLASS_NAMES.SURVIVES_TURBONAV}' class during turbo navigation`,
                            node,
                        );
                        return true;
                    }
                    if (node.id === "svelte-inspector-host") {
                        log("Preserving Svelte inspector host node", node);
                        return true;
                    }
                }
                return false;
            },
        });
        window.history.pushState({}, "", opts.url);
        if (!opts.hmr) {
            window.scrollTo(0, 0);
        }
        if (opts.hmr) {
            window.dispatchEvent(new CustomEvent(HOME_EVENT_NAMES.HMR_HAPPENED, { detail: {} }));
        } else {
            window.dispatchEvent(
                new CustomEvent(HOME_EVENT_NAMES.TURBO_NAVIGATION_HAPPENED, { detail: {} }),
            );
        }
    } catch (error) {
        home.error("Error applying page markup:", error);
        window.location.href = opts.url;
    }
}

export async function setupTurboLinks() {
    // turbolinks don't work right for now, let's disable them.
    return;

    document.addEventListener("click", (event: MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            return;
        }

        const target = event.target as HTMLElement;
        const link = target.closest("a");
        if (!link) {
            return;
        }

        let href = link.getAttribute("href");

        if (!href) {
            log("Click event: Link has no/empty href, ignoring");
            return;
        }

        if (href.startsWith("#")) {
            log("Click event: Link is a fragment, ignoring");
            return;
        }

        const url = new URL(link.href, window.location.origin);
        log("Click event: Link found", {
            href: link.href,
            targetUrl: url.href,
            currentOrigin: window.location.origin,
            targetOrigin: url.origin,
        });

        if (url.origin !== window.location.origin && url.origin !== "") {
            log("Click event: External link detected, not intercepting", {
                targetOrigin: url.origin,
                currentOrigin: window.location.origin,
            });
            return;
        }

        log("Click event: Internal link detected, intercepting navigation");
        event.preventDefault();
        applyDiff({ url: url.href, hmr: false, scrollToTop: true });
    });

    window.addEventListener("popstate", async () => {
        // Do we just not need to do anything?
        // const url = new URL(window.location.href);
        // await applyDiff({ url: url.href, hmr: false, scrollToTop: false });
    });
}
