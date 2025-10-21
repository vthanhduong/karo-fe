import { dom, state } from "./context.js";
import { formatTimeLabel, scrollChatToBottom, scrollLobbyChatToBottom } from "./ui.js";

export function onChatMessage(message) {
  if (!state.game) return;
  const wrap = document.createElement("div");
  wrap.className = "chat-message";
  if (message.from?.id === state.user?.id || message.from?.player === state.game.myMark) {
    wrap.classList.add("self");
  }
  const author = document.createElement("div");
  author.className = "author";
  const mark = message.from?.player ? message.from.player.toUpperCase() : "?";
  author.textContent = `${message.from?.name ?? "Ẩn danh"} (${mark})`;
  const content = document.createElement("div");
  content.textContent = message.text;
  wrap.append(author, content);
  dom.chatMessages.appendChild(wrap);
  scrollChatToBottom();
}

export function onLobbyChatMessage(message) {
  if (!dom.lobbyChatMessages) return;
  const wrap = document.createElement("div");
  wrap.className = "floating-message";
  const isSelf = message.from?.id === state.user?.id;
  if (isSelf) {
    wrap.classList.add("self");
  }
  const meta = document.createElement("div");
  meta.className = "meta";
  const name = document.createElement("span");
  name.textContent = message.from?.name ?? "Ẩn danh";
  const time = document.createElement("span");
  time.textContent = formatTimeLabel(message.sentAt);
  meta.append(name, time);
  const content = document.createElement("div");
  content.textContent = message.text;
  wrap.append(meta, content);
  dom.lobbyChatMessages.appendChild(wrap);
  if (state.lobbyChatCollapsed && !isSelf && dom.lobbyChat) {
    dom.lobbyChat.classList.add("has-unread");
  }
  scrollLobbyChatToBottom(isSelf);
}
