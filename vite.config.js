import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { resolve } from "path";

export default defineConfig({
    clearScreen: false,
    plugins: [
        wasm(),
        topLevelAwait(),
        svelte({
            inspector: {
                toggleKeyCombo: "alt-x",
                showToggleButton: "always",
                toggleButtonPos: "bottom-right",
            },
        }),
    ],
    resolve: {
        alias: {
            "@home-base-fonts": resolve(__dirname, "src/lib/sass/fonts"),
        },
    },
    build: {
        target: "esnext",
        outDir: "vite-dist", // Output directory for the build (default is 'dist')
        rollupOptions: {
            input: ["./index.html"],
        },
    },
    server: {
        port: 5173,
    },
});
