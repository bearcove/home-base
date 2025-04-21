import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import Button from "./Button.svelte";
import { createRawSnippet } from "svelte";

describe("Button", () => {
    it("renders correctly with default props", () => {
        const { container } = render(Button, {
            props: {
                children: createRawSnippet(() => ({
                    render: () => {
                        return "Test Button";
                    },
                    setup: (el) => {},
                })),
                onclick: () => {},
            },
        });

        const button = container.querySelector("button");
        expect(button).toBeInTheDocument();
        expect(button?.textContent?.trim()).toBe("Test Button");
        expect(button).not.toHaveClass("big");
    });

    it("applies the big class when big prop is true", () => {
        const { container } = render(Button, {
            props: {
                children: createRawSnippet(() => ({
                    render: () => {
                        return "Big Button";
                    },
                    setup: (el) => {},
                })),
                onclick: () => {},
                big: true,
            },
        });

        const button = container.querySelector("button");
        expect(button).toBeInTheDocument();
        expect(button?.textContent?.trim()).toBe("Big Button");
        expect(button).toHaveClass("big");
    });

    it("calls the onclick handler when clicked", async () => {
        const handleClick = vi.fn();

        const { container } = render(Button, {
            props: {
                children: createRawSnippet(() => ({
                    render: () => {
                        return "Clickable Button";
                    },
                    setup: (el) => {},
                })),
                onclick: handleClick,
            },
        });

        const button = container.querySelector("button");
        expect(button).toBeInTheDocument();
        await fireEvent.click(button!);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies custom styles when style prop is provided", () => {
        const { container } = render(Button, {
            props: {
                children: createRawSnippet(() => ({
                    render: () => {
                        return "Styled Button";
                    },
                    setup: (el) => {},
                })),
                onclick: () => {},
                style: "background-color: red; color: white;",
            },
        });

        const button = container.querySelector("button");
        expect(button).toBeInTheDocument();
        expect(button?.textContent?.trim()).toBe("Styled Button");
        expect(button).toHaveStyle({
            backgroundColor: "rgb(255, 0, 0)",
            color: "rgb(255, 255, 255)",
        });
    });
});
