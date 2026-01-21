import { state } from "./context.js";
import { handleDisconnect, handleMessage } from "./handlers.js";
import { showToast } from "./ui.js";

function getWsUrl() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  // WHAT THE FUCK IS HAPPENING?!
  return `${protocol}://karo-be.nytx.space/ws`;
}

export function connect(name) {
  disconnectSocket();
  state.socket = new WebSocket(getWsUrl());

  state.socket.addEventListener("open", () => {
    send({ type: "join_request", name });
  });

  state.socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (err) {
      console.error("Invalid payload", err);
    }
  });

  state.socket.addEventListener("close", () => {
    handleDisconnect();
  });

  state.socket.addEventListener("error", () => {
    showToast("Không thể kết nối tới máy chủ", "error");
  });
}

export function disconnectSocket() {
  if (state.socket && state.socket.readyState <= 1) {
    state.socket.close();
  }
  state.socket = null;
}

export function send(payload) {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    state.socket.send(JSON.stringify(payload));
  }
}
