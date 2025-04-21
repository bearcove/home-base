<script lang="ts">
    import { onMount } from "svelte";
    import debug from "debug";
    import { HOME_SPECIAL_CLASS_NAMES } from "..";

    const log = debug("error-handler");

    let error: string | null = null;

    onMount(() => {
        const revisionErrorHandler = ((event: CustomEvent) => {
            log("Received revision-error event:", event.detail);
            error = event.detail.error;
        }) as EventListener;

        const newRevisionHandler = (() => {
            log("Received new-revision event, clearing error");
            error = null;
        }) as EventListener;

        window.addEventListener("revision-error", revisionErrorHandler);
        window.addEventListener("new-revision", newRevisionHandler);

        return () => {
            window.removeEventListener("revision-error", revisionErrorHandler);
            window.removeEventListener("new-revision", newRevisionHandler);
        };
    });
</script>

<div class={["build-errors-overlay", HOME_SPECIAL_CLASS_NAMES.SURVIVES_HMR]} class:hidden={!error}>
    <div class="error-content">
        <h2>Build Error</h2>
        <pre class="home-ansi">{@html error}</pre>
    </div>
</div>

<style>
    .build-errors-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;

        &.hidden {
            display: none;
        }
    }

    .error-content {
        background-color: #111;
        color: white;
        padding: 20px;
        border-radius: 5px;
        max-width: 920px;
    }

    pre {
        white-space: pre-wrap;
        max-height: 860px;
        overflow-y: auto;
        font-size: 0.85rem;
    }
</style>
