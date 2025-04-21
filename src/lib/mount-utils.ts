import { mount, type Component, type MountOptions } from "svelte";
import debug from "debug";

const log = debug("mountOrShowError");

type Exports = Record<string, any>;

type Target = MountOptions["target"];

function targetToElement(target: Document | Element | ShadowRoot): Element {
    if (target instanceof Document) {
        return target.body;
    } else if (target instanceof ShadowRoot) {
        return target.host;
    } else {
        return target;
    }
}

export function mountOrShowError<Props extends Record<string, any> = Record<string, any>>(
    component: Component<Props, Exports, any>,
    options: MountOptions<Props>,
) {
    const element = targetToElement(options.target);

    try {
        const result = mount(component, options);
        return result;
    } catch (e: any) {
        console.error("While mounting component", component, options);
        console.error("Got error", e);
        let markup =
            "<p>Woops, some JavaScript broke. Details are in console, reach out if you want to!</p>";
        if (window.location.protocol === "http:") {
            markup += `<pre style="min-height: 8em; width: 100%; overflow: scroll; font-size: .8rem"><span style="color: red">${e}</span>\n${e.stack}</pre>`;
        }
        element.innerHTML = markup;
    }
}
