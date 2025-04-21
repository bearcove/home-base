<script lang="ts">
    import { Icon } from "svelte-icons-pack";
    import { BiSearchAlt } from "svelte-icons-pack/bi";
    import { BsFileText } from "svelte-icons-pack/bs";
    import debug from "debug";

    const log = debug("search");

    type Completion = {
        kind: CompletionKind;
        text: string;
        html: string;
        url?: string;
    };

    type CompletionKind = "term" | "article";

    let query = $state(new URLSearchParams(window.location.search).get("q") || "");
    let completions: Completion[] = $state([]);
    let activeIndex = $state(-1);
    let focused = $state(false);
    let loading = $state(false);
    let inputEl = $state<HTMLInputElement>();

    let mkSearchUrl = (query: string) => {
        let params = new URLSearchParams();
        params.set("q", query);
        return `/search?${params}`;
    };

    let completionIcon = (completion: Completion) => {
        if (completion.kind === "term") {
            return "mingcute:search-3-line";
        } else {
            return "mingcute:paper-line";
        }
    };

    let completionUrl = (completion: Completion) => {
        if (completion.url) {
            return completion.url;
        } else {
            return mkSearchUrl(completion.text);
        }
    };

    let refresh = async (query: string) => {
        let params = new URLSearchParams();
        params.set("q", query);
        let res = await fetch(`/api/autocomplete?${params}`);
        let results: Completion[] = await res.json();

        completions.length = 0;
        completions.push(...results);
        activeIndex = -1;
    };

    let submit = (e: Event) => {
        e.preventDefault();
        loading = true;
        if (activeIndex !== -1 && completions[activeIndex]) {
            let completion = completions[activeIndex];
            window.location.href = completionUrl(completion);
        } else {
            window.location.href = mkSearchUrl(query);
        }
    };

    let keydown = (e: KeyboardEvent) => {
        if (e.code === "Enter") {
            submit(e);
        }
        if (e.code === "ArrowUp" || (e.shiftKey && e.code === "Tab")) {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + completions.length) % completions.length;
        } else if (e.code === "ArrowDown" || (!e.shiftKey && e.code === "Tab")) {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % completions.length;
        }
    };

    $effect(() => {
        if (query.length > 0) {
            refresh(query);
        } else {
            completions.length = 0;
        }
    });

    let keyHandler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            if (inputEl) {
                inputEl.focus();
                inputEl.select();
                inputEl.scrollIntoView({
                    behavior: "smooth",
                });
            }
        }
    };

    $effect(() => {
        document.addEventListener("keydown", keyHandler);
        return () => {
            document.removeEventListener("keydown", keyHandler);
        };
    });
</script>

<div
    class="search-container"
    tabindex="-1"
    onfocusin={() => {
        focused = true;
        log("Search input focused");
    }}
    onfocusout={() => {
        log("Search input unfocused");
        setTimeout(() => {
            log("Now clearing focused");
            focused = false;
        }, 250);
    }}
>
    <input
        bind:this={inputEl}
        class={loading ? "loading" : ""}
        type="search"
        placeholder={`Search... ${navigator.platform.includes("Mac") ? "(⌘ K)" : "(Ctrl+K)"}`}
        onsubmit={submit}
        onkeydown={keydown}
        bind:value={query}
    />

    {#if focused && completions.length > 0}
        <div class="completions">
            {#each completions as completion, index}
                <a
                    class="completion {index === activeIndex ? 'active' : ''}"
                    onmouseenter={() => (activeIndex = index)}
                    onclick={() => (loading = true)}
                    href={completionUrl(completion)}
                >
                    {#if completion.kind === "term"}
                        <Icon src={BiSearchAlt} />
                    {:else}
                        <Icon src={BsFileText} />
                    {/if}
                    <span class="term">
                        {@html completion.html}
                    </span>
                </a>
            {/each}
        </div>
    {/if}
</div>

<style>
    .search-container {
        position: relative;
    }

    .completions {
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 100%;
        width: 200%;
        max-width: 60vw;

        background: light-dark(white, #1a1a1a);
        border: 1px solid light-dark(#ccc, #444);
        border-radius: 4px;
        z-index: 10;

        font-weight: 400;
        font-size: 0.9rem;

        overflow-x: scroll;

        .completion {
            display: flex;
            align-items: center;
            padding: 0.2em 0.4em;
            gap: 0.4em;
            white-space: pre;
            flex-shrink: 0;

            :global(svg) {
                flex-shrink: 0;
            }

            &.active {
                background: light-dark(#e6f0ff, #2a2a2a);
            }
        }
    }

    input[type="search"] {
        border: 1px solid light-dark(#bebebe, #585858);
        background: light-dark(#fbfbfb, #454545);
        border-radius: 4px;
        color: light-dark(#313131, #f0f0f0);
        transition: opacity 0.2s ease;
        width: 100%;

        font-size: 0.95rem;
        padding: 0.3em 0.6em;

        &.loading {
            animation: loading-bounce 0.6s ease-in-out infinite;
            opacity: 0.6;
        }
    }

    a {
        color: light-dark(#313131, #f0f0f0);
        text-decoration: none;
    }
</style>
