<script lang="ts">
    import { tick } from "svelte";
    import type { LogMessage } from "./types";
    import DOMPurify from "dompurify";

    let { logs, success = false }: { logs: LogMessage[], success?: boolean } = $props();
    let logsElement: HTMLDivElement | undefined = $state();
    let errorsOnly: boolean = $state(false);

    function filteredLogs(errorsOnly: boolean): LogMessage[] {
        if (errorsOnly) {
            return logs.filter((log) => log.level === "error");
        }
        return logs;
    }

    function sanitizeHtml(html: string): string {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "code", "pre", "span"],
            ALLOWED_ATTR: ["href", "target", "rel", "class"],
        });
    }

    $effect.pre(() => {
        if (!logsElement) return; // not yet mounted

        // reference `logs` array length so that this code re-runs whenever it changes
        logs.length;

        // autoscroll when new logs are added
        if (logsElement.offsetHeight + logsElement.scrollTop > logsElement.scrollHeight - 20) {
            tick().then(() => {
                logsElement?.scrollTo(0, logsElement.scrollHeight);
            });
        }
    });
</script>

<div class="errors-filter">
    <label>
        <input type="checkbox" bind:checked={errorsOnly} />
        Errors only
    </label>
</div>

<div class="log-entries" bind:this={logsElement} class:success>
    {#each filteredLogs(errorsOnly) as log}
        <p class="{log.level} home-ansi">
            {@html sanitizeHtml(log.message)}
            {#if log.url}
                <a href={log.url} target="_blank" rel="noreferrer">
                    {log.url}
                </a>
            {/if}
        </p>
    {/each}
</div>

<style>
    .log-entries {
        border: 1px solid var(--text-color);
        font-size: 0.9em;
        padding: 0.4em 0.6em;
        flex-grow: 1;
        flex-shrink: 1;
        min-height: 20em;
        overflow-y: scroll;

        font-family: "IosevkaFtl", monospace;
        color: var(--text-color);

        /* Scrollbar styles */
        scrollbar-width: thin;
        scrollbar-color: white black;

        /* For WebKit browsers */
        &::-webkit-scrollbar {
            width: 12px;
        }

        &::-webkit-scrollbar-track {
            background: black;
        }

        &::-webkit-scrollbar-thumb {
            background-color: white;
            border-radius: 6px;
            border: 3px solid black;
        }

        &.success {
            border-color: #4CAF50;
        }

        p {
            align-items: center;
            gap: 0.4em;
            margin: 0;
            width: 100%;

            white-space: pre-wrap;
            overflow-x: auto;
            flex-shrink: 0;

            &.debug {
                color: #6c757d;
            }
            &.info {
                color: #e6e6e6;
            }
            &.warn {
                color: #ffc107;
            }
            &.error {
                color: #e04050;
            }

            a, a:visited {
                color: var(--text-color);
            }
        }
    }

    .errors-filter {
        padding-bottom: 0.5em;
    }

    a {
        text-overflow: ellipsis;
        max-width: 500px;
        overflow: hidden;
    }
</style>
