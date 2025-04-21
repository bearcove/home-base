<script lang="ts">
    import { Icon } from "svelte-icons-pack";
    import { BsJournalText } from "svelte-icons-pack/bs";
    import { BsFileImage } from "svelte-icons-pack/bs";
    import { HOME_SPECIAL_CLASS_NAMES } from "..";

    interface XY {
        x: number;
        y: number;
    }

    type DragTarget = Paragraph | Diagram;

    type DragTargetBase = {
        el: Element;
    };

    type Paragraph = DragTargetBase & {
        kind: "paragraph";
        // grabbed from data-bo
        byteOffset: number;
    };

    type Diagram = DragTargetBase & {
        kind: "diagram";
        inputPath: string;
    };

    let isParagraph = (d: any): d is Paragraph => {
        return d && d.kind === "paragraph";
    };

    let isDiagram = (d: any): d is Diagram => {
        return d && d.kind === "diagram";
    };

    let isAiming = $state(false);
    let highlightedBoundingBox = $derived.by(() => dragTarget?.el.getBoundingClientRect() || null);
    let dragTarget = $state<DragTarget | null>(null);
    let mousePos = $state<XY>({ x: 0, y: 0 });

    let onKeyDown = (event: KeyboardEvent) => {
        if (event.code === "KeyE" && event.altKey) {
            isAiming = !isAiming;
            if (isAiming) {
                document.body.style.cursor = "crosshair";
                updateDragTarget();
            } else {
                document.body.style.cursor = "default";
            }
        } else if (event.code === "Escape" && isAiming) {
            isAiming = false;
            document.body.style.cursor = "default";
        }
    };

    let updateDragTarget = () => {
        if (!isAiming) return;

        const el = document.elementFromPoint(mousePos.x, mousePos.y);

        // First check for diagram
        const diagramImg = el?.closest("img[data-kind='diagram']");
        if (diagramImg) {
            const inputPath = diagramImg.getAttribute("data-input-path");
            if (inputPath) {
                dragTarget = {
                    kind: "diagram",
                    inputPath,
                    el: diagramImg,
                };
                document.body.style.cursor = "text";
                return;
            }
        }

        // If no diagram found, check for paragraph
        const closest = el?.closest("[data-bo]");
        if (closest) {
            const bo = closest.getAttribute("data-bo");
            dragTarget = {
                kind: "paragraph",
                el: closest,
                byteOffset: bo ? parseInt(bo) : 0,
            };
            document.body.style.cursor = "text";
            return;
        }

        dragTarget = null;
        document.body.style.cursor = "not-allowed";
    };

    let onMouseMove = (event: MouseEvent) => {
        mousePos = { x: event.clientX, y: event.clientY };
        updateDragTarget();
    };

    let onClick = () => {
        if (!isAiming || !dragTarget) return;

        isAiming = false;
        document.body.style.cursor = "default";

        if (isParagraph(dragTarget)) {
            const path = document
                .querySelector("meta[property='home:page-path']")
                ?.getAttribute("content");

            fetch("/internal-api/open-in-editor", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input_path: path,
                    byte_offset: dragTarget.byteOffset,
                }),
            });
        } else if (isDiagram(dragTarget)) {
            fetch("/internal-api/edit-asset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input_path: dragTarget.inputPath,
                }),
            });
        }
    };

    let onScroll = (event: Event) => {
        const lastMouseEvent = new MouseEvent("mousemove", {
            clientX: mousePos.x,
            clientY: mousePos.y,
        });
        onMouseMove(lastMouseEvent);
    };

    $effect(() => {
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("scroll", onScroll);
        document.addEventListener("click", onClick);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("scroll", onScroll);
            document.removeEventListener("click", onClick);
        };
    });
</script>

<div
    class={["open-in-editor-overlay", HOME_SPECIAL_CLASS_NAMES.SURVIVES_HMR]}
    class:hidden={!isAiming}
>
    {#if highlightedBoundingBox && dragTarget}
        <div
            class="highlight {isParagraph(dragTarget)
                ? 'paragraph-highlight'
                : 'diagram-highlight'}"
            style="
        top: {highlightedBoundingBox.top - 8}px;
        left: {highlightedBoundingBox.left - 8}px;
        width: {highlightedBoundingBox.width + 16}px;
        height: {highlightedBoundingBox.height + 16}px;
      "
        >
            <div class="message">
                {isParagraph(dragTarget) ? "Click to open in editor" : "Click to edit diagram"}
            </div>
            <div class="icon-container">
                {#if isParagraph(dragTarget)}
                    <Icon src={BsJournalText} size="24px" color="#000" />
                {:else}
                    <Icon src={BsFileImage} size="24px" color="#000" />
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .open-in-editor-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.6);

        &.hidden {
            display: none;
        }
    }

    .highlight {
        position: fixed;
        backdrop-filter: brightness(1.8);
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .message {
        position: absolute;
        top: -40px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.9);
        color: black;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        white-space: nowrap;
    }

    .icon-container {
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .paragraph-highlight {
        background: rgba(0, 0, 255, 0.1);
    }

    .diagram-highlight {
        background: rgba(0, 255, 0, 0.1);
    }
</style>
