import { unmount } from "svelte";
import AdminDrawer from "./admin/AdminDrawer.svelte";
import { updateCopyCodeButtons } from "./admin/update-copy-code-buttons";
import { setupLiveReload } from "./live-reload";
import { mountOrShowError, HOME_EVENT_NAMES } from ".";
import debug from "debug";

const log = debug("admin");

let adminDrawerRef: any;

function mountAdminDrawer() {
    const target = document.body;

    if (adminDrawerRef) {
        unmount(adminDrawerRef);
    }
    adminDrawerRef = mountOrShowError(AdminDrawer, {
        target: target,
    });
}

function mountAll() {
    mountAdminDrawer();
    updateCopyCodeButtons();
}

export function renderAdmin() {
    setupLiveReload();

    window.addEventListener(HOME_EVENT_NAMES.TURBO_NAVIGATION_HAPPENED, ((event: Event) => {
        // not ideal, ideally we'd keep them mounted but for now shrug.
        log("render done, remounting admin stuff");
        mountAll();
    }) as EventListener);
    mountAll();
}
