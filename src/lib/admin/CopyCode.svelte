<script lang="ts">
    let { targetElement } = $props();
    import { copyToClipboard } from "./copy-to-clipboard";

    let copied = $state(false);
    let copyPromise: Promise<void> | null = $state(null);

    function handleCopy() {
        copyPromise = copyToClipboard(targetElement);
        copyPromise.then(() => {
            copied = true;
            setTimeout(() => (copied = false), 2000);
        });
    }
</script>

<button class="copypaste {copied ? 'copied' : ''}" onclick={handleCopy}>
    {#if copied}
        Copied!
    {:else if copyPromise}
        {#await copyPromise}
            Copying...
        {:catch}
            Failed to copy
        {/await}
    {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
            />
        </svg>
    {/if}
</button>

<style>
    .copypaste {
        opacity: 0.2;
        position: absolute;
        right: 0px;
        bottom: 0px;
        background: none;
        padding: 4px 8px;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        color: inherit;
        font-size: 1rem;
        font-family: inherit;
        border: none;
        transition: border-color 0.1s ease-in-out;
        border-radius: 4px;
    }

    .copypaste:hover {
        opacity: 1;
        border-color: #e0e0e0;
    }

    .copypaste:active {
        border-color: #4a4a4a;
    }

    .copypaste::before {
        content: "";
        position: absolute;
        top: -5px;
        right: -5px;
        bottom: -5px;
        left: -5px;
    }

    .copypaste :global(svg) {
        width: 25px;
        height: 25px;
        fill: light-dark(#333, #f1f1f1);
    }

    .copypaste.copied {
        animation: copied 0.03s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @keyframes copied {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.12) rotate(-3deg);
            opacity: 0.7;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
</style>
