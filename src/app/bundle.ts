import "./style.scss";

import { SearchBar, renderAdmin } from "../lib";
import { mount } from "svelte";

let searchBarDiv = document.getElementById("search-bar");
if (!searchBarDiv) {
    throw new Error("oh no");
}
mount(SearchBar, {
    target: searchBarDiv,
    props: {},
});

// Declare type extensions for `env` to check out
declare global {
    interface ImportMetaEnv {
        readonly DEV: boolean;
        readonly PROD: boolean;
        readonly MODE: "development" | "production";
        readonly BASE_URL: string;
        // Add other environment variables as needed
        readonly VITE_API_URL: string;
        readonly VITE_APP_TITLE: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

if (import.meta.env.DEV) {
    renderAdmin();
}
