/**
 * A console wrapper that prepends "[home] " to all log messages.
 */
function log(...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
        console.log(`[home] ${args[0]}`, ...args.slice(1));
    } else {
        console.log("[home]", ...args);
    }
}

/**
 * A console wrapper that prepends "[home] " to all error messages.
 */
function error(...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
        console.error(`[home] ${args[0]}`, ...args.slice(1));
    } else {
        console.error("[home]", ...args);
    }
}

/**
 * A console wrapper that prepends "[home] " to all debug messages.
 */
function debug(...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
        console.debug(`[home] ${args[0]}`, ...args.slice(1));
    } else {
        console.debug("[home]", ...args);
    }
}

export const home = { log, error, debug };
