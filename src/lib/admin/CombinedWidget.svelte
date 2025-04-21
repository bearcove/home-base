<script lang="ts">
    import { Icon } from "svelte-icons-pack";
    import { AiOutlineCloudUpload } from "svelte-icons-pack/ai";
    import { AiFillCheckCircle } from "svelte-icons-pack/ai";
    import Logs from "./Logs.svelte";
    import Button from "./Button.svelte";
    import type { LogMessage, DeployMessage, ValidationMessage } from "./types";
    import confetti from "canvas-confetti";

    let progress: number = $state(0);
    let logs: LogMessage[] = $state([
        {
            level: "info",
            message: "Waiting for instructions.",
        },
    ]);
    let activeOperation: "deploy" | "validate" | null = $state(null);
    let deploymentComplete: boolean = $state(false);

    function deploy() {
        resetState();
        activeOperation = "deploy";
        progress = 2;
        deploymentComplete = false;

        let start = Date.now();

        logs.push({
            level: "info",
            message: "Starting deployment...",
        });

        const ws = new WebSocket(
            `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/internal-api/deploy`,
        );

        let done = false;

        ws.onmessage = (event: MessageEvent) => {
            const m: DeployMessage = JSON.parse(event.data);
            if ("logMessage" in m) {
                logs.push(m.logMessage);
            } else if ("assetProgress" in m) {
                progress = (m.assetProgress.uploaded / m.assetProgress.total) * 100;
            } else if ("deployComplete" in m) {
                done = true;
                const end = Date.now();
                const duration = (end - start) / 1000;
                logs.push({
                    level: "info",
                    message: `Deployment ${m.deployComplete.complete ? "completed" : "failed"} in ${duration.toFixed(2)} seconds.`,
                });
                logs.push({
                    level: "info",
                    message: "Check out",
                    url: `https://${m.deployComplete.domain}`,
                });
                ws.onerror = null;
                ws.onclose = null;
                progress = 100;
                deploymentComplete = true;
                if (m.deployComplete.complete) {
                    confetti({
                        disableForReducedMotion: true,
                    });
                }
            }
        };

        ws.onerror = (event: Event) => {
            logs.push({
                level: "error",
                message: `Deployment WebSocket error: ${event}`,
            });
            progress = 100;
        };

        ws.onclose = () => {
            logs.push({
                level: "info",
                message: "Deployment process ended",
            });
        };
    }

    function validate() {
        resetState();
        activeOperation = "validate";

        logs.push({
            level: "info",
            message: "Starting validation...",
        });

        const ws = new WebSocket(
            `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/internal-api/validation`,
        );

        ws.onmessage = (event: MessageEvent) => {
            const m: ValidationMessage = JSON.parse(event.data);
            if ("logMessage" in m) {
                logs.push(m.logMessage);
            } else if ("routeResult" in m) {
                progress += 0.2;
                logs.push({
                    level: "info",
                    message: `HTTP ${m.routeResult.status}`,
                    url: m.routeResult.url,
                });
            } else if ("badLink" in m) {
                logs.push({
                    level: "warn",
                    message: `Bad link in ${m.badLink.route}: ${m.badLink.reason}`,
                    url: m.badLink.href,
                });
            } else if ("mathError" in m) {
                logs.push({
                    level: "error",
                    message: `Math errors found in ${m.mathError.route}`,
                    url: m.mathError.route,
                });
            } else if ("validationComplete" in m) {
                logs.push({
                    level: "info",
                    message: `Validation complete: ${m.validationComplete.num_errors} errors`,
                });
                progress = 100;
            }
        };

        ws.onclose = () => {
            logs.push({
                level: "info",
                message: "Validation complete",
            });
        };
    }

    function resetState() {
        logs.length = 0;
        progress = 0;
        deploymentComplete = false;

        logs.push({
            level: "info",
            message: "Starting new operation...",
        });
    }

    $effect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.altKey && event.code === "KeyD") {
                deploy();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    });
</script>

<div class="main-container">
    <div class="buttons">
        <Button onclick={deploy}>
            <Icon src={AiOutlineCloudUpload} />
            Deploy
        </Button>
        <Button onclick={validate}>
            <Icon src={AiFillCheckCircle} />
            Validate
        </Button>

        <div class="logo">
            <a href="https://home.bearcove.eu/">home</a> admin panel
        </div>
    </div>

    <div class="progress-container">
        <progress value={progress} max="100"></progress>
        <span class="operation-label">
            {#if activeOperation}
                {activeOperation === "deploy" ? "Deploying" : "Validating"}: {progress.toFixed(0)}%
            {:else}
                Ready
            {/if}
        </span>
    </div>

    <Logs {logs} success={deploymentComplete} />
</div>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        gap: 0.2em;
        height: 600px;
        font-family: "Inter", sans-serif;
    }

    .buttons {
        display: flex;
        gap: 0.8em;

        align-items: center;

        .logo {
            justify-self: flex-end;
            font-size: 1.4em;
            font-weight: 300;

            a {
                font-weight: 900;
                font-style: normal;
                color: var(--accent-color);
            }
        }
    }

    .progress-container {
        display: flex;
        align-items: center;
        gap: 0.8em;
    }

    progress {
        flex-grow: 1;
        height: 6px;
        border: none;
        border-radius: 4px;
    }

    progress::-webkit-progress-bar {
        background-color: var(--secondary-color);
        border-radius: 4px;
    }

    progress::-webkit-progress-value {
        background-color: var(--accent-color);
        border-radius: 4px;
    }

    progress::-moz-progress-bar {
        background-color: var(--accent-color);
        border-radius: 4px;
    }

    .operation-label {
        color: var(--container-bg-color);
    }

    :global(.success) {
        border: 2px solid var(--accent-color);
    }
</style>
