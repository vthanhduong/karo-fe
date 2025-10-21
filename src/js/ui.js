import { dom, state } from "./context.js";

export function switchScreen(target) {
  Object.entries(dom.screens).forEach(([name, element]) => {
    element.classList.toggle("hidden", name !== target);
  });
}

export function scrollChatToBottom(force = false) {
  if (!dom.chatMessages) return;
  if (force || state.chatAutoScroll) {
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }
}

export function scrollLobbyChatToBottom(force = false) {
  if (!dom.lobbyChatMessages) return;
  if (force || state.lobbyChatAutoScroll) {
    dom.lobbyChatMessages.scrollTop = dom.lobbyChatMessages.scrollHeight;
  }
}

export function setLobbyChatCollapsed(collapsed) {
  state.lobbyChatCollapsed = collapsed;
  if (!dom.lobbyChat || !dom.lobbyChatToggle) return;
  dom.lobbyChat.classList.toggle("collapsed", collapsed);
  dom.lobbyChatToggle.textContent = collapsed ? "‹" : "›";
  dom.lobbyChatToggle.setAttribute("aria-expanded", String(!collapsed));
  dom.lobbyChatToggle.setAttribute("aria-label", collapsed ? "Mở chat" : "Thu nhỏ chat");
  if (!collapsed) {
    dom.lobbyChat.classList.remove("has-unread");
    scrollLobbyChatToBottom(true);
  }
}

export function formatTimeLabel(isoString) {
  if (!isoString) return "";
  const time = new Date(isoString);
  if (Number.isNaN(time.getTime())) return "";
  return time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function showToast(text, variant = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.textContent = text;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hidden");
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

export function initializeAutoScrollWatchers() {
  if (dom.chatMessages) {
    dom.chatMessages.addEventListener("scroll", () => {
      const { scrollHeight, scrollTop, clientHeight } = dom.chatMessages;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      state.chatAutoScroll = distanceFromBottom <= 24;
    });
  }

  if (dom.lobbyChatMessages) {
    dom.lobbyChatMessages.addEventListener("scroll", () => {
      const { scrollHeight, scrollTop, clientHeight } = dom.lobbyChatMessages;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      state.lobbyChatAutoScroll = distanceFromBottom <= 24;
      if (state.lobbyChatAutoScroll && dom.lobbyChat) {
        dom.lobbyChat.classList.remove("has-unread");
      }
    });
  }
}
