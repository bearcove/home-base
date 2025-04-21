export async function copyToClipboard(source: HTMLElement) {
    // Clone the element
    const target = source.cloneNode(true) as HTMLElement;

    const processElement = ({ source, target }: { source: HTMLElement; target: HTMLElement }) => {
        target.removeAttribute("class");
        target.removeAttribute("style");

        // Convert <i> tags to <span>
        if (target.tagName.toLowerCase() === "i") {
            const span = document.createElement("span");
            span.innerHTML = target.innerHTML;
            target.parentNode?.replaceChild(span, target);
        }

        // Copy relevant styles
        const computedStyle = source.computedStyleMap();
        const color = computedStyle.get("color")?.toString();
        if (color) {
            target.style.color = color;
        }

        const fontWeight = computedStyle.get("font-weight")?.toString();
        if (fontWeight) {
            target.style.fontWeight = fontWeight;
        }

        // Process children recursively
        for (let i = 0; i < source.children.length; i++) {
            processElement({
                source: source.children[i] as HTMLElement,
                target: target.children[i] as HTMLElement,
            });
        }
    };

    processElement({ source, target });

    // Create a wrapper with the desired font settings
    const wrapper = document.createElement("div");
    const params = new URLSearchParams(window.location.search);
    wrapper.style.fontSize = params.get("fontsize") || "16pt";
    wrapper.style.fontFamily = params.get("fontfamily") || "IBM Plex Mono";

    target.innerHTML = target.innerHTML.trimEnd();
    wrapper.appendChild(target);

    // Copy to clipboard
    const clipboardItem = new ClipboardItem({
        "text/html": new Blob([wrapper.outerHTML], { type: "text/html" }),
        "text/plain": new Blob([wrapper.innerText], { type: "text/plain" }),
    });

    await navigator.clipboard.write([clipboardItem]);
}
