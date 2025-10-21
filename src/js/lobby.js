import { dom, state } from "./context.js";
import { showToast } from "./ui.js";
import { SEARCH_DEBOUNCE } from "./settings.js";

let searchTimer = null;

export function renderLobby() {
  if (!dom.userTemplate) return;
  const fragment = document.createDocumentFragment();
  const tmpl = dom.userTemplate.content.firstElementChild;
  const filters = state.filterQuery.trim().toLowerCase();
  const disabledTargets = new Set(Array.from(state.pendingInvites.values()));

  state.lobbyUsers
    .filter((user) => user.id !== state.user?.id)
    .filter((user) => !filters || user.name.toLowerCase().includes(filters))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    .forEach((user) => {
      const node = tmpl.cloneNode(true);
      node.dataset.id = user.id;
      node.querySelector(".username").textContent = user.name;
      node.querySelector(".meta").textContent = user.inGame ? "Đang thi đấu" : "Sẵn sàng";
      const button = node.querySelector(".invite-button");
      button.dataset.id = user.id;
      button.disabled = user.inGame || disabledTargets.has(user.id);
      if (disabledTargets.has(user.id)) {
        button.textContent = "Đã mời";
      }
      fragment.appendChild(node);
    });

  dom.userList.innerHTML = "";
  dom.userList.appendChild(fragment);
}

export function updateLobbyUser(user) {
  const index = state.lobbyUsers.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    state.lobbyUsers[index] = user;
  } else {
    state.lobbyUsers.push(user);
  }
  renderLobby();
}

export function onInviteReceived({ inviteId, from, expiresAt }) {
  state.activeInvite = { inviteId, from, expiresAt: expiresAt ? new Date(expiresAt).getTime() : null };
  dom.inviteText.textContent = `${from.name} muốn thách đấu bạn!`;
  dom.inviteModal.classList.remove("hidden");
  if (state.inviteTimer) {
    clearTimeout(state.inviteTimer);
  }
  if (state.activeInvite.expiresAt) {
    const timeLeft = Math.max(0, state.activeInvite.expiresAt - Date.now());
    state.inviteTimer = setTimeout(() => hideInviteModal(), timeLeft);
  }
}

export function hideInviteModal() {
  dom.inviteModal.classList.add("hidden");
  if (state.inviteTimer) {
    clearTimeout(state.inviteTimer);
    state.inviteTimer = null;
  }
  state.activeInvite = null;
}

export function onInviteDeclined({ inviteId, reason }) {
  const targetId = state.pendingInvites.get(inviteId);
  state.pendingInvites.delete(inviteId);
  renderLobby();
  if (reason === "timeout") {
    showToast("Lời mời đã hết hạn", "error");
  } else if (targetId) {
    showToast("Đối thủ đã từ chối", "error");
  }
}

export function onInviteCancelled(message) {
  if (state.activeInvite && state.activeInvite.inviteId === message.inviteId) {
    hideInviteModal();
    showToast("Lời mời đã bị hủy", "error");
  }
}

export function scheduleSearchUpdate(handler, value) {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filterQuery = value;
    handler();
  }, SEARCH_DEBOUNCE);
}
