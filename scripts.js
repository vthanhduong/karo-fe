const BOARD_SIZE = 17;
const SEARCH_DEBOUNCE = 300;
const BACKEND_PORT = 8000;

const state = {
  socket: null,
  user: null,
  lobbyUsers: [],
  filterQuery: "",
  pendingInvites: new Map(),
  activeInvite: null,
  inviteTimer: null,
  game: null,
  timerInterval: null,
  chatAutoScroll: true,
  lobbyChatAutoScroll: true,
  lobbyChatCollapsed: false,
};

const dom = {
  screens: {
    login: document.getElementById("login-screen"),
    lobby: document.getElementById("lobby-screen"),
    game: document.getElementById("game-screen"),
  },
  loginForm: document.getElementById("login-form"),
  nameInput: document.getElementById("name-input"),
  loginError: document.getElementById("login-error"),
  selfLabel: document.getElementById("self-label"),
  logoutButton: document.getElementById("logout-button"),
  searchInput: document.getElementById("search-input"),
  userList: document.getElementById("user-list"),
  userTemplate: document.getElementById("user-row-template"),
  board: document.getElementById("board"),
  gameStatus: document.getElementById("game-status"),
  leaveGameButton: document.getElementById("leave-game-button"),
  playerNames: {
    x: document.getElementById("player-x-name"),
    o: document.getElementById("player-o-name"),
  },
  playerStatus: {
    x: document.getElementById("player-x-status"),
    o: document.getElementById("player-o-status"),
  },
  turnIndicator: document.getElementById("turn-indicator"),
  turnCountdown: document.getElementById("turn-countdown"),
  chatMessages: document.getElementById("chat-messages"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  inviteModal: document.getElementById("invite-modal"),
  inviteText: document.getElementById("invite-text"),
  inviteAccept: document.getElementById("invite-accept"),
  inviteDecline: document.getElementById("invite-decline"),
  toastContainer: document.getElementById("toast-container"),
  lobbyChat: document.getElementById("lobby-chat"),
  lobbyChatToggle: document.getElementById("lobby-chat-toggle"),
  lobbyChatMessages: document.getElementById("lobby-chat-messages"),
  lobbyChatForm: document.getElementById("lobby-chat-form"),
  lobbyChatInput: document.getElementById("lobby-chat-input"),
};

function scrollChatToBottom(force = false) {
  if (!dom.chatMessages) return;
  if (force || state.chatAutoScroll) {
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }
}

if (dom.chatMessages) {
  dom.chatMessages.addEventListener("scroll", () => {
    const el = dom.chatMessages;
    const threshold = 24;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    state.chatAutoScroll = distanceFromBottom <= threshold;
  });
}

function scrollLobbyChatToBottom(force = false) {
  if (!dom.lobbyChatMessages) return;
  if (force || state.lobbyChatAutoScroll) {
    dom.lobbyChatMessages.scrollTop = dom.lobbyChatMessages.scrollHeight;
  }
}

if (dom.lobbyChatMessages) {
  dom.lobbyChatMessages.addEventListener("scroll", () => {
    const el = dom.lobbyChatMessages;
    const threshold = 24;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    state.lobbyChatAutoScroll = distanceFromBottom <= threshold;
    if (state.lobbyChatAutoScroll && dom.lobbyChat) {
      dom.lobbyChat.classList.remove("has-unread");
    }
  });
}

function setLobbyChatCollapsed(collapsed) {
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

function formatTimeLabel(isoString) {
  if (!isoString) return "";
  const time = new Date(isoString);
  if (Number.isNaN(time.getTime())) return "";
  return time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const wsUrl = (() => {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://karo-be.onrender.com/ws`;
  // return `${protocol}://${location.hostname}:${BACKEND_PORT}/ws`;
})();

function switchScreen(target) {
  Object.entries(dom.screens).forEach(([name, element]) => {
    element.classList.toggle("hidden", name !== target);
  });
}

function connect(name) {
  disconnectSocket();
  state.socket = new WebSocket(wsUrl);

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

function disconnectSocket() {
  if (state.socket && state.socket.readyState <= 1) {
    state.socket.close();
  }
  state.socket = null;
}

function send(payload) {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    state.socket.send(JSON.stringify(payload));
  }
}

function handleMessage(message) {
  switch (message.type) {
    case "join_ok":
      onJoinOk(message);
      break;
    case "join_error":
      dom.loginError.textContent = message.reason === "name_taken" ? "Tên đã được sử dụng." : "Tên không hợp lệ.";
      disconnectSocket();
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

function updateLobbyUser(user) {
  const index = state.lobbyUsers.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    state.lobbyUsers[index] = user;
  } else {
    state.lobbyUsers.push(user);
  }
  renderLobby();
}

let searchTimer = null;
function renderLobby() {
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

function onInviteReceived(message) {
  const { inviteId, from, expiresAt } = message;
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

function hideInviteModal() {
  dom.inviteModal.classList.add("hidden");
  if (state.inviteTimer) {
    clearTimeout(state.inviteTimer);
    state.inviteTimer = null;
  }
  state.activeInvite = null;
}

function onInviteDeclined(message) {
  const { inviteId, reason } = message;
  const targetId = state.pendingInvites.get(inviteId);
  state.pendingInvites.delete(inviteId);
  renderLobby();
  if (reason === "timeout") {
    showToast("Lời mời đã hết hạn", "error");
  } else if (targetId) {
    showToast("Đối thủ đã từ chối", "error");
  }
}

function onInviteCancelled(message) {
  if (state.activeInvite && state.activeInvite.inviteId === message.inviteId) {
    hideInviteModal();
    showToast("Lời mời đã bị hủy", "error");
  }
}

function buildBoard() {
  dom.board.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const cells = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cell = document.createElement("button");
      cell.className = "board-cell";
      cell.type = "button";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      fragment.appendChild(cell);
      row.push("");
    }
    cells.push(row);
  }
  state.game.board = cells;
  dom.board.appendChild(fragment);
}

function onGameStart(message) {
  state.pendingInvites.clear();
  hideInviteModal();
  state.game = {
    id: message.gameId,
    board: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill("")),
    players: message.players,
    turn: message.turn,
    myMark: determineMyMark(message.players),
    turnDeadline: message.turnDeadline ? new Date(message.turnDeadline).getTime() : null,
  };
  buildBoard();
  updatePlayersPanel();
  updateTurnInfo(message.turn, state.game.turnDeadline);
  dom.gameStatus.textContent = `Bạn đang chơi với ${getOpponentName()}`;
  dom.chatMessages.innerHTML = "";
  state.chatAutoScroll = true;
  scrollChatToBottom(true);
  if (dom.lobbyChat) {
    dom.lobbyChat.classList.add("hidden");
  }
  switchScreen("game");
}

function determineMyMark(players) {
  if (!state.user) return null;
  if (players.x.id === state.user.id) return "x";
  if (players.o.id === state.user.id) return "o";
  return null;
}

function getOpponentName() {
  if (!state.game || !state.user) return "";
  const opponent = Object.values(state.game.players).find((player) => player.id !== state.user.id);
  return opponent ? opponent.name : "đối thủ";
}

function updatePlayersPanel() {
  if (!state.game) return;
  dom.playerNames.x.textContent = state.game.players.x.name;
  dom.playerNames.o.textContent = state.game.players.o.name;
  dom.playerStatus.x.textContent = state.game.turn === "x" ? "Đang tới lượt" : "Đang chờ";
  dom.playerStatus.o.textContent = state.game.turn === "o" ? "Đang tới lượt" : "Đang chờ";
  document.querySelectorAll(".player-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.mark === state.game.turn);
  });
}

function updateTurnInfo(turn, deadlineMs) {
  if (!state.game) return;
  state.game.turn = turn;
  state.game.turnDeadline = deadlineMs || null;
  updatePlayersPanel();
  const markLabel = turn ? turn.toUpperCase() : "-";
  dom.turnIndicator.textContent = turn ? `Người chơi ${markLabel}` : "-";
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  if (!deadlineMs) {
    dom.turnCountdown.textContent = "-";
    return;
  }
  const render = () => {
    const remaining = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
    dom.turnCountdown.textContent = `${remaining}s`;
    if (remaining <= 0 && state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  };
  render();
  state.timerInterval = setInterval(render, 500);
}

function clearWinningHighlights() {
  dom.board.querySelectorAll(".board-cell.win").forEach((cell) => cell.classList.remove("win"));
}

function onMoveResult(message) {
  if (!state.game) return;
  const { move, nextTurn, winningLine, turnDeadline, timeout } = message;
  clearWinningHighlights();
  if (timeout?.player) {
    const loser = timeout.player.toUpperCase();
    dom.gameStatus.textContent = `Người chơi ${loser} đã hết thời gian.`;
  }
  if (move) {
    const cell = dom.board.querySelector(`.board-cell[data-x="${move.x}"][data-y="${move.y}"]`);
    if (cell) {
      cell.textContent = move.player.toUpperCase();
      cell.classList.add(move.player === "x" ? "mark-x" : "mark-o");
      state.game.board[move.y][move.x] = move.player;
    }
  }
  if (Array.isArray(winningLine)) {
    winningLine.forEach(({ x, y }) => {
      const cell = dom.board.querySelector(`.board-cell[data-x="${x}"][data-y="${y}"]`);
      if (cell) cell.classList.add("win");
    });
  }
  if (nextTurn) {
    const deadline = turnDeadline ? new Date(turnDeadline).getTime() : null;
    updateTurnInfo(nextTurn, deadline);
  } else {
    updateTurnInfo(null, null);
  }
}

function onSurrender(message) {
  if (!state.game) return;
  if (message.player) {
    const mark = String(message.player).toUpperCase();
    dom.gameStatus.textContent = `Người chơi ${mark} đã đầu hàng.`;
  }
}

function onGameOver(message) {
  clearInterval(state.timerInterval ?? 0);
  state.timerInterval = null;
  dom.gameStatus.textContent = "Ván đấu đã kết thúc.";
}

function onGameResult(message) {
  const { winner, you, reason } = message;
  if (!you) return;
  const youWon = winner === you;
  let text = youWon ? "Bạn đã thắng!" : winner ? "Bạn đã thua." : "Ván đấu hòa.";
  if (reason === "timeout" && youWon) {
    text = "Đối thủ hết thời gian, bạn thắng!";
  } else if (reason === "timeout" && !youWon) {
    text = "Bạn đã hết thời gian.";
  } else if (reason === "disconnect") {
    text = youWon ? "Đối thủ đã thoát, bạn thắng." : "Bạn đã rời trận.";
  } else if (reason === "surrender" && youWon) {
    text = "Đối thủ đã đầu hàng.";
  } else if (reason === "surrender" && !youWon) {
    text = "Bạn đã đầu hàng.";
  }
  showToast(text, youWon ? "success" : "error");
}

function onReturnToLobby() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.pendingInvites.clear();
  state.game = null;
  dom.chatMessages.innerHTML = "";
  state.chatAutoScroll = true;
  scrollChatToBottom(true);
  dom.board.innerHTML = "";
  dom.turnIndicator.textContent = "-";
  dom.turnCountdown.textContent = "-";
  if (dom.lobbyChat) {
    dom.lobbyChat.classList.remove("hidden");
    if (!state.lobbyChatCollapsed) {
      scrollLobbyChatToBottom(true);
    }
  }
  switchScreen("lobby");
  renderLobby();
}

function onChatMessage(message) {
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

function onLobbyChatMessage(message) {
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

function handleDisconnect() {
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

function showToast(text, variant = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.textContent = text;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hidden");
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

// Event bindings

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

dom.logoutButton.addEventListener("click", () => {
  disconnectSocket();
  handleDisconnect();
  showToast("Đã đăng xuất", "success");
});

dom.searchInput.addEventListener("input", (event) => {
  const value = event.target.value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filterQuery = value;
    renderLobby();
  }, SEARCH_DEBOUNCE);
});

dom.userList.addEventListener("click", (event) => {
  const button = event.target.closest(".invite-button");
  if (!button || button.disabled) return;
  const targetId = button.dataset.id;
  if (!targetId || !state.user) return;
  send({ type: "invite_sent", targetId });
});

dom.inviteAccept.addEventListener("click", () => {
  if (!state.activeInvite) return;
  send({ type: "invite_response", inviteId: state.activeInvite.inviteId, accepted: true });
  hideInviteModal();
});

dom.inviteDecline.addEventListener("click", () => {
  if (!state.activeInvite) return;
  send({ type: "invite_response", inviteId: state.activeInvite.inviteId, accepted: false });
  hideInviteModal();
});

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

dom.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = dom.chatInput.value.trim();
  if (!text || !state.game) return;
  send({ type: "chat_message", gameId: state.game.id, text });
  dom.chatInput.value = "";
});

dom.leaveGameButton.addEventListener("click", () => {
  if (!state.game) return;
  if (!confirm("Bạn chắc chắn muốn đầu hàng?")) {
    return;
  }
  send({ type: "surrender", gameId: state.game.id });
});

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
