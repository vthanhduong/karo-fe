import { dom, state } from "./context.js";
import { connect, disconnectSocket, send } from "./socket.js";
import { handleDisconnect } from "./handlers.js";
import { hideInviteModal, renderLobby, scheduleSearchUpdate } from "./lobby.js";
import { scrollLobbyChatToBottom, setLobbyChatCollapsed, showToast } from "./ui.js";

export function registerEventListeners() {
  if (dom.loginForm) {
    dom.loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = dom.nameInput.value.trim();
      if (name.length < 3 || name.length > 20) {
        dom.loginError.textContent = "Tên phải từ 3 đến 20 ký tự.";
        return;
      }
      dom.loginError.textContent = "";
      connect(name);
    });
  }

  if (dom.logoutButton) {
    dom.logoutButton.addEventListener("click", () => {
      disconnectSocket();
      handleDisconnect();
      showToast("Đã đăng xuất", "success");
    });
  }

  if (dom.searchInput) {
    dom.searchInput.addEventListener("input", (event) => {
      const value = event.target.value;
      scheduleSearchUpdate(renderLobby, value);
    });
  }

  if (dom.userList) {
    dom.userList.addEventListener("click", (event) => {
      const button = event.target.closest(".invite-button");
      if (!button || button.disabled) return;
      const targetId = button.dataset.id;
      if (!targetId || !state.user) return;
      send({ type: "invite_sent", targetId });
    });
  }

  if (dom.inviteAccept) {
    dom.inviteAccept.addEventListener("click", () => {
      if (!state.activeInvite) return;
      send({ type: "invite_response", inviteId: state.activeInvite.inviteId, accepted: true });
      hideInviteModal();
    });
  }

  if (dom.inviteDecline) {
    dom.inviteDecline.addEventListener("click", () => {
      if (!state.activeInvite) return;
      send({ type: "invite_response", inviteId: state.activeInvite.inviteId, accepted: false });
      hideInviteModal();
    });
  }

  if (dom.board) {
    dom.board.addEventListener("click", (event) => {
      const cell = event.target.closest(".board-cell");
      if (!cell || !state.game || !state.user) return;
      if (state.game.myMark !== state.game.turn) {
        showToast("Chưa tới lượt của bạn", "error");
        return;
      }
      const x = Number(cell.dataset.x);
      const y = Number(cell.dataset.y);
      if (state.game.board[y][x]) return;
      send({ type: "game_move", gameId: state.game.id, x, y });
    });
  }

  if (dom.chatForm) {
    dom.chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = dom.chatInput.value.trim();
      if (!text || !state.game) return;
      send({ type: "chat_message", gameId: state.game.id, text });
      dom.chatInput.value = "";
    });
  }

  if (dom.leaveGameButton) {
    dom.leaveGameButton.addEventListener("click", () => {
      if (!state.game) return;
      if (!confirm("Bạn chắc chắn muốn đầu hàng?")) {
        return;
      }
      send({ type: "surrender", gameId: state.game.id });
    });
  }

  if (dom.lobbyChatToggle) {
    dom.lobbyChatToggle.addEventListener("click", () => {
      setLobbyChatCollapsed(!state.lobbyChatCollapsed);
    });
  }

  if (dom.lobbyChatForm) {
    dom.lobbyChatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = dom.lobbyChatInput?.value.trim();
      if (!value) return;
      send({ type: "lobby_chat", text: value });
      if (dom.lobbyChatInput) {
        dom.lobbyChatInput.value = "";
      }
      state.lobbyChatAutoScroll = true;
      scrollLobbyChatToBottom(true);
    });
  }

  window.addEventListener("beforeunload", () => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.close();
    }
  });
}
