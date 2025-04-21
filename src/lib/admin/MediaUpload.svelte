<script lang="ts">
    import { Icon } from "svelte-icons-pack";
    import Button from "./Button.svelte";
    import CircularProgress from "./CircularProgress.svelte";
    import * as api from "./media-upload-types";
    import { TrOutlineTextCaption } from "svelte-icons-pack/tr";
    import {
        BiChart,
        BiFile,
        BiHeart,
        BiLink,
        BiLowVision,
        BiSolidErrorCircle,
    } from "svelte-icons-pack/bi";
    import debug from "debug";

    const log = debug("media-upload");

    let formatByteSizeForHumans = (bytes: number) => {
        const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
        if (bytes === 0) return "0 Bytes";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
    };

    interface Asset {
        type: string;
        name: string;
        size: number;
        slice(start?: number, end?: number): Blob;
    }

    type IdleStage = {
        stage: "idle";
    };

    type ErrorStage = {
        stage: "error";
        error: string;
    };

    type Media = {
        fileName: string;
        contentType: string;
        previewDataURL: string;
    };

    type Plan = {
        media: Media;
        action: api.Action;
        byte_offset: number;
    };

    type UploadingStage = {
        stage: "uploading";
        plan: Plan;
        progress: number;
        conversion_progress?: number;
        ready: boolean;
        initial_size: number;
        output_size: number;
        media_props?: api.MediaProps;
    };

    type MediaKind = "image" | "video";

    type Stage = IdleStage | ErrorStage | UploadingStage;

    let getPageInputPath = () => {
        const metaElement = document.querySelector('meta[property="home:page-path"]');
        if (!metaElement) {
            throw new Error("Meta tag with property 'home:page-path' not found");
        }
        const content = metaElement.getAttribute("content");
        if (!content) {
            throw new Error("Meta tag with property 'home:page-path' has no content");
        }
        return content;
    };

    let stage: Stage = $state({ stage: "idle" });

    let mediaKind: MediaKind = $state("image");
    let ext: string = $state(".jxl");
    let name: string = $state("");
    let suffix: string | null = $state(null);
    let nameEl: HTMLInputElement | null = $state(null);
    let alt = $state("");
    let title: string = $state("");
    let attr: string = $state("");
    let attrlink: string = $state("");

    let isFigure: boolean = $derived(title.length > 0 || attr.length > 0 || attrlink.length > 0);

    $effect(() => {
        if (nameEl) {
            nameEl.focus();
            nameEl.select();
        }
    });

    let dropTarget: HTMLElement | null = $state(null);

    let clearDropTarget = () => {
        if (dropTarget) {
            dropTarget.classList.remove("drop-target", "append", "replace");
            dropTarget = null;
        }
    };

    type TargetAndAction = {
        target: HTMLElement;
        byte_offset: number;
        action: api.Action;
    };

    let ws: WebSocket | null = $state(null);

    let getTargetAndAction = (event: DragEvent): TargetAndAction | null => {
        let target = (event.target as HTMLElement).closest(
            "[data-bo]",
        ) as HTMLParagraphElement | null;
        if (target) {
            const byte_offset = parseInt(target.dataset.bo || "", 10);
            if (isNaN(byte_offset)) return null;

            const action: api.Action =
                event.clientX < target.offsetLeft + target.offsetWidth / 2 ? "replace" : "append";

            return { target, byte_offset, action };
        } else {
            // are we hovering over the title?
            let target = (event.target as HTMLElement).closest(".page-title") as HTMLElement | null;
            if (target) {
                const action: api.Action = "set_thumb";
                return { target, byte_offset: 0, action };
            }
        }
        return null;
    };

    let onDrop = async (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        window.focus();
        log("drop", event.target, event);

        let targetAndAction = getTargetAndAction(event);
        if (!targetAndAction) {
            log("No target and action");
            return;
        }

        if (!event.dataTransfer || !event.dataTransfer.files) {
            log("No files in data transfer");
            return;
        }

        let asset: Asset;
        let previewDataURL: string;

        let file = event.dataTransfer.files[0];
        if (file) {
            asset = {
                type: file.type,
                name: file.name,
                size: file.size,
                slice: (start?: number, end?: number) => file.slice(start, end),
            };
            previewDataURL = URL.createObjectURL(file);
        } else if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
            const item = event.dataTransfer.items[0];
            log("URL drop detected:", {
                kind: item.kind,
                type: item.type,
            });
            const url = event.dataTransfer.getData("text/uri-list");
            log("URL:", url);
            const text = event.dataTransfer.getData("text/plain");
            log("Text:", text);

            function generateNameFromContentType(base: string, mime_type: string): string {
                const mimeToExt: Record<string, string> = {
                    "image/png": ".png",
                    "image/jpeg": ".jpg",
                    "image/gif": ".gif",
                    "image/svg+xml": ".svg",
                    "image/webp": ".webp",
                    "video/mp4": ".mp4",
                    "video/webm": ".webm",
                    "video/ogg": ".ogv",
                    "video/quicktime": ".mov",
                    "application/pdf": ".pdf",
                };

                const ext = mimeToExt[mime_type] || ".bin";
                return base + ext;
            }

            if (url.startsWith("data:")) {
                // Handle data URL via built-in fetch API
                const response = await fetch(url);
                const blob = await response.blob();
                asset = {
                    type: blob.type,
                    name: generateNameFromContentType("pasted", blob.type),
                    size: blob.size,
                    slice: (start?: number, end?: number) => blob.slice(start, end),
                };
                previewDataURL = url;
            } else {
                // Handle regular URL
                const queryParams = new URLSearchParams({ url });
                const response = await fetch(`/internal-api/download-url?${queryParams}`);
                if (!response.ok) {
                    log("Failed to download URL:", response.statusText);
                    return;
                }

                const contentType =
                    response.headers.get("content-type") || "application/octet-stream";
                let blob = await response.blob();
                asset = {
                    type: contentType,
                    name: generateNameFromContentType(
                        url.split("/").pop() || "downloaded_file",
                        contentType,
                    ),
                    size: blob.size,
                    slice: (start?: number, end?: number) => blob.slice(start, end),
                };
                previewDataURL = URL.createObjectURL(blob);
            }
        } else {
            log("No files or URLs in data transfer");
            return;
        }

        log("First file:", asset);

        if (asset.type.startsWith("image/")) {
            log("Image file detected:", asset.type);
            mediaKind = "image";
        } else if (asset.type.startsWith("video/")) {
            log("Video file detected:", asset.type);
            mediaKind = "video";
        } else if (asset.name.toLowerCase().endsWith(".mkv")) {
            log("MKV video file detected");
            mediaKind = "video";
        } else {
            log("Non-image/video file detected");
            return;
        }

        switch (mediaKind) {
            case "image":
                log("mediaKind is image, asset type is ", asset.type);
                if (asset.type.startsWith("image/svg")) {
                    log("setting extension to .svg for SVG image");
                    ext = ".svg";
                } else {
                    log("setting extension to .jxl for non-SVG image");
                    ext = ".jxl";
                }
                break;
            case "video":
                log("mediaKind is video, setting extension to .mp4");
                ext = ".mp4";
                break;
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}/internal-api/media-upload`);
        ws.binaryType = "arraybuffer";

        const Headers: api.HeadersMessage = {
            page_input_path: getPageInputPath(),
            file_name: asset.name,
            file_size: asset.size,
            action: targetAndAction.action,
            paragraph_byte_offset: targetAndAction.byte_offset,
        };

        ws.onopen = () => {
            if (!ws) {
                return;
            }

            log("WebSocket connection established");
            let msg: api.WebSocketMessage = { Headers };
            ws.send(JSON.stringify(msg));

            const chunkSize = 256 * 1024; // 256KB
            let offset = 0;

            const sendChunk = () => {
                if (stage.stage !== "uploading") {
                    return;
                }
                if (!ws) {
                    return;
                }

                const chunk = asset.slice(offset, offset + chunkSize);
                ws.send(chunk);
                offset += chunk.size;

                if (offset < asset.size) {
                    if (window.location.hash === "#slow-upload-for-demo") {
                        setTimeout(sendChunk, 60);
                    } else {
                        setTimeout(sendChunk, 0);
                    }

                    stage = {
                        ...stage,
                        progress: offset / asset.size,
                    };
                } else {
                    // Send UploadDoneMessage when we're done
                    let msg: api.WebSocketMessage = {
                        UploadDone: { uploaded_size: asset.size },
                    };
                    ws.send(JSON.stringify(msg));

                    stage = {
                        ...stage,
                        progress: 1.0,
                    };
                }
            };

            sendChunk();
        };

        ws.onmessage = (event) => {
            const message: api.WebSocketMessage = JSON.parse(event.data);
            if ("ConversionDone" in message) {
                log("Conversion done");
                if (stage.stage === "uploading") {
                    stage.ready = true;
                    stage.output_size = message.ConversionDone.file_size;
                }
            } else if ("MediaIdentified" in message) {
                if (stage.stage === "uploading") {
                    stage.media_props = message.MediaIdentified;
                }
            } else if ("ConversionProgress" in message) {
                if (stage.stage === "uploading") {
                    let { processed_time, total_time } = message.ConversionProgress;
                    stage.conversion_progress = processed_time / total_time;
                }
            } else if ("ActionDone" in message) {
                log("Action done");
                goIdle();
            } else if ("Error" in message) {
                log("Error from server:", message.Error);
                stage = {
                    stage: "error",
                    error: message.Error,
                };
                if (ws) {
                    ws.close();
                    ws = null;
                }
            }
        };

        stage = {
            stage: "uploading",
            plan: {
                action: targetAndAction.action,
                byte_offset: targetAndAction.byte_offset,
                media: {
                    fileName: asset.name,
                    contentType: asset.type,
                    previewDataURL,
                },
            },
            progress: 0,
            ready: false,
            output_size: 0,
            initial_size: asset.size,
        };
        log("stage is now", stage);

        let nameIsFixed = false;

        if (targetAndAction.action == "set_thumb") {
            // file name is fixed then
            name = "_thumb";
            nameIsFixed = true;
        } else {
            // strip the extension from the original file name
            name = asset.name.replace(/\.[^.]+$/, "");
        }

        if (targetAndAction.action === "replace") {
            let mediaEl = targetAndAction.target.querySelector(
                '[data-kind="media"]',
            ) as HTMLElement | null;
            if (mediaEl) {
                // Extract the name and alt text from existing image
                // For data-input-path like: "/content/articles/the-decibels-we-made-along-the-way/taupe-circle@2x.jxl"
                let inputPath = mediaEl.getAttribute("data-input-path") || "";
                let fileName = inputPath.split("/").pop() || "";

                // For fileName like: "taupe-circle@2x.jxl"
                // match[1] will be "taupe-circle"
                // match[2] will be "@2x" if present
                let match = fileName.match(/^(.*)(@2x)?\..*$/);
                if (match) {
                    name = match[1];
                    suffix = match[2] || null;
                }

                // Alt text will be the full descriptive text like:
                // "Our window now has a taupe-colored circle in the background, straight in the middle of the window. This is a screenshot of the UI we just wrote."
                alt = mediaEl.getAttribute("alt") || "";
                title = mediaEl.getAttribute("title") || "";
                nameIsFixed = true;
            }

            let citeEl = targetAndAction.target.querySelector("cite") as HTMLElement | null;
            if (citeEl) {
                let linkEl = citeEl.querySelector("a") as HTMLAnchorElement | null;
                if (linkEl) {
                    attr = linkEl.textContent || "";
                    attrlink = linkEl.href || "";
                } else {
                    attr = citeEl.textContent || "";
                }
            }
        }

        const match = name.match(/^(.*)(@2x)$/);
        if (match) {
            name = match[1];
            suffix = match[2];
        } else {
            suffix = null;
        }

        if (!nameIsFixed) {
            // okay we derived the name from a file name, let's normalize a bit: remove non-alphanumeric characters,
            // turn spaces into dashes, remove extra dashes, and lowercase everything
            name = name
                .replace(/[^a-zA-Z0-9 .-]/g, "")
                .replace(/ /g, "-")
                .replace(/-+/g, "-")
                .toLowerCase();

            if (asset.name.startsWith("CleanShot ")) {
                // Okay, so this isn't going to be everyone's case, but in my case, clean chart videos are always two acts.
                suffix = "@2x";
            }
        }

        setTimeout(() => {
            nameEl?.focus();
        }, 0);
    };

    $effect(() => {
        const dragoverHandler = (event: DragEvent) => {
            event.preventDefault();
            event.stopPropagation();

            let targetAndAction = getTargetAndAction(event);
            if (!targetAndAction) {
                clearDropTarget();
                return;
            }

            let { target, action } = targetAndAction;
            clearDropTarget();
            dropTarget = target as HTMLElement;
            dropTarget.classList.add("drop-target", action);
        };

        const dragleaveHandler = (event: DragEvent) => {
            event.preventDefault();
            event.stopPropagation();
            log("dragleave", event.target, event);
            clearDropTarget();
        };

        const keydownHandler = (event: KeyboardEvent) => {
            if (stage.stage === "uploading") {
                if (event.key === "Escape") {
                    goIdle();
                }

                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    handleCommit();
                }
            }
        };

        const dropHandler = (event: DragEvent) => {
            window.focus();

            log("drop", event);
            clearDropTarget();
            onDrop(event);
        };

        document.addEventListener("dragover", dragoverHandler);
        document.addEventListener("dragleave", dragleaveHandler);
        document.addEventListener("keydown", keydownHandler);
        document.addEventListener("drop", dropHandler);

        return () => {
            log("MediaUpload unmounting, removing all event listeners");
            document.removeEventListener("dragover", dragoverHandler);
            document.removeEventListener("dragleave", dragleaveHandler);
            document.removeEventListener("keydown", keydownHandler);
            document.removeEventListener("drop", dropHandler);
        };
    });

    let goIdle = () => {
        if (ws) {
            ws.close();
            ws = null;
        }
        stage = { stage: "idle" };
        name = "";
        alt = "";
        title = "";
    };

    const handleCommit = () => {
        if (stage.stage !== "uploading") return;
        if (!ws) return;

        const Commit: api.CommitMessage = {
            name: name + (suffix ?? ""),
            alt: alt,
            title: title,
            attr: attr.length > 0 ? attr : undefined,
            attrlink: attrlink.length > 0 ? attrlink : undefined,
            is_figure: isFigure,
        };

        {
            let msg: api.WebSocketMessage = { Commit };
            ws.send(JSON.stringify(msg));
        }
    };
</script>

{#if stage.stage === "uploading"}
    <div class="image-preview takeover">
        <div class="image-container">
            <div
                class="image-upload-overlay"
                style="height: {(1.0 - stage.progress) * 100}%;"
            ></div>
            {#if mediaKind === "image"}
                <img src={stage.plan.media.previewDataURL} alt="Preview" />
            {:else}
                <!-- svelte-ignore a11y_media_has_caption -->
                <video
                    src={stage.plan.media.previewDataURL}
                    controls
                    preload="auto"
                    autoplay
                    volume={0}
                    loop
                ></video>
            {/if}
        </div>

        <div class="row">
            <div class="controls">
                <span>
                    {#if isFigure}
                        <Icon src={BiChart} />
                    {:else}
                        <Icon src={BiFile} />
                    {/if}
                </span>
                <input
                    type="text"
                    bind:value={name}
                    bind:this={nameEl}
                    class:good={name.length > 0}
                    onkeydown={(ev) => {
                        if (ev.key === "Escape") {
                            goIdle();
                        } else if (ev.key === "Enter") {
                            handleCommit();
                        }
                    }}
                    placeholder="imagename"
                    disabled={stage.stage === "uploading" && stage.plan.action === "set_thumb"}
                />
                <span class="fixed">
                    {#if suffix}
                        <span class="suffix">{suffix}</span>
                    {/if}
                    {ext}
                </span>

                <Icon src={BiLowVision} />
                <textarea
                    bind:value={alt}
                    class:good={alt.length > 15}
                    placeholder="ALT text (describes the image for non-sighted people) 🔍"
                    rows="3"
                ></textarea>
                <span></span>

                <Icon src={TrOutlineTextCaption} />
                <textarea
                    bind:value={title}
                    class:good={title.length == 0 || title.length > 10}
                    placeholder="Caption (additional comment, visible under the figure) ✨"
                    rows="3"
                ></textarea>
                <span></span>

                <Icon src={BiHeart} />
                <input bind:value={attr} class:good={attr.length > 0} placeholder="Attribution" />
                <span></span>

                <Icon src={BiLink} />
                <input
                    bind:value={attrlink}
                    class:good={attrlink.length > 0}
                    placeholder="Attribution link"
                />
                <span></span>
            </div>

            <div class="progress-container">
                <div class="status-text">
                    {#if stage.progress < 1.0}
                        <span class="progress-line">
                            <CircularProgress
                                radius={10}
                                progress={stage.progress}
                                color="#4CAF50"
                            /> Uploading...{" "}
                            {(stage.progress * 100).toFixed(0)}%
                        </span>
                    {:else if !stage.ready}
                        <span class="progress-line">
                            <CircularProgress
                                radius={10}
                                progress={stage.conversion_progress ?? 0}
                                color="#2196F3"
                            />{" "}
                            Converting... {stage.conversion_progress
                                ? (stage.conversion_progress * 100).toFixed(0) + "%"
                                : ""}
                        </span>
                    {:else}
                        Press <code>⌘↵</code> to {stage.plan.action === "replace"
                            ? "replace"
                            : "insert"}
                        <br />
                        <span class="tag size">{formatByteSizeForHumans(stage.initial_size)}</span>
                        <span class="tag codec"
                            >{stage.media_props?.vp?.codec ??
                                stage.media_props?.ic ??
                                "unknown"}</span
                        >
                        →
                        <span class="tag size">{formatByteSizeForHumans(stage.output_size)}</span>
                        <span class="tag codec">{ext}</span>
                        <br />
                        (<em
                            >{Math.round((1 - stage.output_size / stage.initial_size) * 100)}%
                            smaller</em
                        >)
                        {#if stage.media_props}
                            {#if stage.media_props?.dims}
                                <span class="tag dimensions"
                                    >{stage.media_props.dims.w}x{stage.media_props.dims.h}</span
                                >
                            {/if}
                            {#if stage.media_props?.secs}
                                <span class="tag duration"
                                    >{stage.media_props.secs.toFixed(1)}s</span
                                >
                            {/if}
                            <br />
                        {/if}
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

{#if stage.stage === "error"}
    <div class="error-container takeover">
        <div class="error-message">
            <Icon src={BiSolidErrorCircle} />
            <p>{stage.error}</p>
        </div>
        <Button
            onclick={() => {
                stage = { stage: "idle" };
            }}
        >
            Dismiss
        </Button>
    </div>
{/if}

<style>
    .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1em;
    }

    .error-message {
        display: flex;
        align-items: center;
        gap: 0.5em;
        font-size: 1.2em;
        color: #ff3e3e;

        p {
            white-space: pre-wrap;
        }
    }

    .fixed {
        display: inline-flex;
        flex-direction: row;
        align-items: center;

        .suffix {
            color: light-dark(#ff6b6b, #ff8a8a);
        }
    }

    .takeover {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: light-dark(#f1f1f1ee, #2a2828ee);
        z-index: 1000;
    }

    .image-preview {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: stretch;
        padding: 2em;
        overflow: hidden;
        height: 100%;

        gap: 1em;

        .image-container {
            flex-grow: 1;
            overflow: hidden;
            position: relative;
            gap: 1em;

            .image-upload-overlay {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;

                backdrop-filter: blur(5px);

                transition: all 0.1s ease-in-out;
            }

            img,
            video {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
        }

        .controls {
            align-self: center;
            max-width: 40em;

            display: grid;
            grid-template-columns: 1fr 20fr 1fr;
            gap: 0.2em;
            align-items: center;
            justify-content: center;

            flex-shrink: 0;

            input,
            textarea {
                margin: 0;
            }
        }
    }

    input,
    textarea {
        font-size: inherit;
        border: 2px solid;
        background: light-dark(#f1f1f1, #2a2828);
        padding: 0.1em 0.2em;
        border-radius: 4px;
        background: none;

        transition: all 0.1s ease-in-out;

        &.good {
            border-color: light-dark(#4caf50, #4caf50);
            background: light-dark(rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.2));
        }
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .progress-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 0.4em;
    }

    .status-text {
        em {
            font-style: normal;
            font-size: 80%;
        }

        code {
            padding: 0.2em 0.4em;
            border-radius: 4px;
            background: none;
            border: 1px solid rgb(203, 203, 203);
            box-shadow: 0 0 12px -3px white;
        }
    }

    .row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0.4em;
    }

    .row > * {
        flex-basis: 40%;

        &:first-child {
            flex-basis: 60%;
            flex-grow: 1;
        }
    }

    .tag {
        padding: 0.2em 0.4em;
        border-radius: 4px;
        font-size: 0.8em;
        margin-right: 0.4em;
        background-color: light-dark(#e0e0e0, #3a3a3a);
        color: light-dark(#333, #f0f0f0);
    }

    .tag.dimensions {
        background-color: light-dark(#e8eaf6, #303f9f);
        color: light-dark(#3949ab, #c5cae9);
    }

    .tag.duration {
        background-color: light-dark(#e8f5e9, #2e7d32);
        color: light-dark(#388e3c, #a5d6a7);
    }

    .tag.codec {
        background-color: light-dark(#fff3e0, #f57c00);
        color: light-dark(#fb8c00, #ffe0b2);
    }

    .tag.size {
        background-color: light-dark(#f0f4c3, #9e9d24);
        color: light-dark(#9e9d24, #f0f4c3);
    }

    .progress-line {
        display: flex;
        align-items: center;
        flex-direction: row;
        gap: 0.4em;
    }

    :global(.drop-target) {
        position: relative;
        border-radius: 4px;
        animation: pulsate 0.4s 1 ease-in-out;
        color: light-dark(rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.3));
    }

    :global(.drop-target::before) {
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        border: 2px dashed #4a90e2;
        border-radius: 8px;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2em;
        font-weight: 700;
        color: #4a90e2;
        text-shadow: 0 0 0.8em black;

        background: light-dark(rgba(255, 0, 0, 0.1), rgba(255, 0, 0, 0.2));
    }

    :global(.drop-target.replace::before) {
        content: "Replace with media ♻️";
        color: #e24a4a;
    }

    :global(.drop-target.append::before) {
        content: "Append media after 👇";
        color: #4a90e2;
    }

    :global(.drop-target.set_thumb::before) {
        content: "Set page thumbnail 🖼️";
        color: #42b883;
    }

    @keyframes pulsate {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.03);
        }
    }
</style>
