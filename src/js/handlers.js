import { dom, state } from "./context.js";
import {
  onGameStart,
  onMoveResult,
  onSurrender,
  onGameOver,
  onGameResult,
  onReturnToLobby,
} from "./game.js";
import { onChatMessage, onLobbyChatMessage } from "./chat.js";
import {
  hideInviteModal,
  onInviteCancelled,
  onInviteDeclined,
  onInviteReceived,
  renderLobby,
  updateLobbyUser,
} from "./lobby.js";
import { setLobbyChatCollapsed, showToast, switchScreen } from "./ui.js";

export function handleMessage(message) {
  switch (message.type) {
    case "join_ok":
      onJoinOk(message);
      break;
    case "join_error":
      dom.loginError.textContent =
        message.reason === "name_taken" ? "Tên đã được sử dụng." : "Tên không hợp lệ.";
      if (state.socket && state.socket.readyState <= 1) {
        state.socket.close();
      }
      break;
    case "user_joined":
      state.lobbyUsers.push(message.user);
      renderLobby();
      break;
    case "user_left":
      state.lobbyUsers = state.lobbyUsers.filter((u) => u.id !== message.userId);
      renderLobby();
      break;
    case "user_updated":
      updateLobbyUser(message.user);
      break;
    case "lobby_snapshot":
      state.lobbyUsers = message.users ?? [];
      renderLobby();
      break;
    case "invite_pending":
      state.pendingInvites.set(message.inviteId, message.targetId);
      renderLobby();
      break;
    case "invite_received":
      onInviteReceived(message);
      break;
    case "invite_declined":
      onInviteDeclined(message);
      break;
    case "invite_cancelled":
      onInviteCancelled(message);
      break;
    case "game_start":
      onGameStart(message);
      break;
    case "move_result":
      onMoveResult(message);
      break;
    case "lobby_chat":
      onLobbyChatMessage(message);
      break;
    case "surrender":
      onSurrender(message);
      break;
    case "game_over":
      onGameOver(message);
      break;
    case "game_result":
      onGameResult(message);
      break;
    case "return_to_lobby":
      onReturnToLobby();
      break;
    case "chat_message":
      onChatMessage(message);
      break;
    case "error":
      showToast(message.message || "Có lỗi xảy ra", "error");
      break;
    default:
      console.debug("Unhandled message", message);
  }
}

export function handleDisconnect() {
  if (state.socket) {
    state.socket = null;
  }
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.user = null;
  state.lobbyUsers = [];
  state.pendingInvites.clear();
  state.game = null;
  state.chatAutoScroll = true;
  state.lobbyChatAutoScroll = true;
  state.lobbyChatCollapsed = false;
  if (dom.lobbyChat) {
    dom.lobbyChat.classList.add("hidden");
    dom.lobbyChat.classList.remove("collapsed", "has-unread");
  }
  if (dom.lobbyChatMessages) {
    dom.lobbyChatMessages.innerHTML = "";
  }
  switchScreen("login");
  dom.loginError.textContent = "Kết nối đã đóng.";
}

function onJoinOk(message) {
  state.user = message.self;
  state.lobbyUsers = message.users ?? [];
  state.pendingInvites.clear();
  dom.selfLabel.textContent = `Đang đăng nhập: ${state.user.name}`;
  dom.loginError.textContent = "";
  if (dom.lobbyChat) {
    dom.lobbyChat.classList.remove("hidden");
    setLobbyChatCollapsed(false);
    dom.lobbyChat.classList.remove("has-unread");
  }
  if (dom.lobbyChatMessages) {
    dom.lobbyChatMessages.innerHTML = "";
  }
  state.lobbyChatAutoScroll = true;
  switchScreen("lobby");
  renderLobby();
  showToast("Tham gia lobby thành công", "success");
}
