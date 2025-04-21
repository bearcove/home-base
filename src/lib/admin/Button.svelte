<script lang="ts">
    type Props = {
        children: any
        onclick: (ev: MouseEvent) => void
        style?: string
        big?: boolean
    };
    let {children, big, ...props}: Props = $props();
</script>

<button class:big {...props}>
    {@render children()}
</button>

<style>
    button {
        background-color: var(--accent-color);
        color: var(--dark-text-color);

        border: none;
        padding: .4em .8em;
        text-decoration: none;
        display: inline-block;
        margin: 0.25rem 0.125rem;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.3s ease;

        display: flex;
        justify-content: center;
        align-items: center;
        gap: .4em;

        &.big {
            font-size: 1.4rem;
        }
    }

    button:hover {
        background-color: color-mix(in srgb, var(--accent-color) 80%, white);
    }

    button:active {
        background-color: color-mix(in srgb, var(--accent-color) 80%, black);
    }
</style>
