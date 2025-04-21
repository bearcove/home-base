import { unmount } from "svelte";
import { mountOrShowError } from "../mount-utils";
import CopyCode from "./CopyCode.svelte";

let mountedInstances: Array<{ instance: any }> = [];

/**
 * Updates or injects copy-paste buttons into the page
 * @param targetSelector - CSS selector for code block targets
 */
export function updateCopyCodeButtons(
    targetSelector: string = "code.code-block .scroll-wrapper",
): void {
    // Clean up any existing mounted instances
    cleanupMountedInstances();

    // Find all code blocks that match the selector
    const codeBlocks = document.querySelectorAll(targetSelector);

    // Mount a copy button for each code block
    codeBlocks.forEach((codeBlock) => {
        // Check if the code block already has a parent with position relative
        const parent = codeBlock.parentElement;
        if (!parent) return;

        // Make sure the parent has position relative for absolute positioning of the button
        const parentComputedStyle = window.getComputedStyle(parent);
        if (parentComputedStyle.position === "static") {
            parent.style.position = "relative";
        }

        // Mount the CopyPasteButton component directly to the parent
        const instance = mountOrShowError(CopyCode, {
            target: parent,
            props: {
                targetElement: codeBlock,
            },
        });

        // Store reference for cleanup
        mountedInstances.push({
            instance,
        });
    });
}

/**
 * Removes all mounted copy-paste button instances
 */
function cleanupMountedInstances(): void {
    mountedInstances.forEach(({ instance }) => {
        unmount(instance);
    });

    mountedInstances = [];
}
