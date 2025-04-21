<script lang="ts">
    import { Icon } from "svelte-icons-pack";
    import { FaSolidCircleArrowUp } from "svelte-icons-pack/fa";

    import AdminArea from "./AdminArea.svelte";
    import BuildErrors from "./BuildErrors.svelte";
    import MediaUpload from "./MediaUpload.svelte";
    import OpenInEditor from "./OpenInEditor.svelte";
    import { HOME_SPECIAL_CLASS_NAMES } from "..";

    let shown = $state(false);
    let toggle = () => {
        if (shown) {
            shown = false;
        } else {
            shown = true;
        }
    };

    $effect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.altKey && event.code === "KeyP") {
                toggle();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    });
</script>

<MediaUpload />
<BuildErrors />
<OpenInEditor />

<div class:shown class={["admin-drawer-overlay", HOME_SPECIAL_CLASS_NAMES.SURVIVES_HMR]}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onclick={toggle}>
        <Icon className="arrow" size={24} src={FaSolidCircleArrowUp} />
    </div>

    {#if shown}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
            class="admin-outer-container"
            onclick={() => (shown = false)}
            role="dialog"
            tabindex={0}
        >
            <div
                class="admin-container"
                onclick={(e) => e.stopPropagation()}
                role="dialog"
                tabindex={0}
            >
                <AdminArea />
            </div>
        </div>
    {/if}
</div>

<style>
    .admin-drawer-overlay {
        --accent-color: oklch(0.88 0.0708 73.18);
        --secondary-color: color-mix(in srgb, var(--accent-color) 70%, black);
        --bg-color: rgba(0, 0, 0, 0.8);
        --text-color: oklch(0.98 0.0123 233.34);
        --dark-text-color: oklch(0.1 0.01 233.34);

        color-scheme: dark !important;

        color: var(--text-color);

        font-family: "Inter", sans-serif;
        position: fixed;
        top: 0;
        left: 0;
        width: auto;
        height: auto;
        z-index: 90; /* confetti is 100 */
        font-size: 14px;

        backdrop-filter: blur(0px);

        :global(.arrow) {
            transition: transform ease-out 0.15s;
            cursor: pointer;
            width: 2em;
            height: 2em;

            fill: white;
            border: 1px solid var(--accent-color);
            border-radius: 50%;
            margin: 4px;
            padding: 2px;
            background: var(--bg-color);
        }

        &.shown {
            width: 100%;
            height: 100%;
            backdrop-filter: blur(15px);
            background: var(--bg-color);

            :global(.arrow) {
                transform: rotate(135deg);
            }
        }

        .admin-outer-container {
            width: 100vw;
            height: 100vh;

            display: flex;
            flex-direction: row;
            align-items: start;
            justify-content: center;
        }

        .admin-container {
            max-width: 57.5em;
            box-shadow: 0 0 1.875em -0.625em var(--shadow-color);
            flex-grow: 1;
            max-height: 90vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;

            padding: 0.4em 1.2em;
        }
    }
</style>
