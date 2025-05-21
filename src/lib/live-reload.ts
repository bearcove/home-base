import { home } from "./log";
import { setupTurboLinks, applyDiff } from "./turbo-links";
import {
  type NewRevision,
  type RevisionBroadcastEvent,
  type RevisionErrorEvent,
  isNewRevision,
  isRevisionError,
} from "./revision";

let globalInterval = 0;

export function setupLiveReload(): void {
  let socket: WebSocket | null = null;
  const RECONNECT_INTERVAL = 5000;
  const MAX_RECONNECT_ATTEMPTS = Infinity;
  let reconnectAttempts = 0;

  async function onNewRevision(ev: NewRevision) {
    window.location.reload();
    // await applyDiff({ url: window.location.href, hmr: true, scrollToTop: false });
  }

  async function onRevisionError(ev: RevisionErrorEvent) {
    // emit an event so other elements of the page can react
    let event = new CustomEvent("revision-error", {
      detail: {
        error: ev.RevisionError,
      },
    });
    home.log("Dispatching ", event);
    window.dispatchEvent(event);
  }

  function connectWebSocket() {
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    socket = new WebSocket("/internal-api/ws");

    home.log("connecting...");

    socket.addEventListener("open", () => {
      home.log("connected.");
      reconnectAttempts = 0;
    });

    socket.addEventListener("message", (event) => {
      const data: RevisionBroadcastEvent = JSON.parse(event.data);

      if (isNewRevision(data)) {
        onNewRevision(data).catch((err) => {
          home.error(`Error refreshing page:`, err);
        });
      } else if (isRevisionError(data)) {
        home.error(`Revision error: ${data.RevisionError}`);
        onRevisionError(data).catch((err) => {
          home.error(`Error handling revision error: ${err}`);
        });
      }
    });

    socket.addEventListener("close", (event) => {
      if (!event.wasClean) {
        home.log("WebSocket connection closed unexpectedly. Attempting to reconnect...");
        scheduleReconnect();
      }
    });

    socket.addEventListener("error", (error) => {
      home.error("WebSocket error:", error);
      socket?.close();
      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      home.log(`Reconnect attempt ${reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS}`);
      setTimeout(connectWebSocket, RECONNECT_INTERVAL);
    } else {
      home.error("Max reconnect attempts reached. Please refresh the page manually.");
    }
  }

  // Start the websocket connection
  connectWebSocket();

  setupTurboLinks();
}
