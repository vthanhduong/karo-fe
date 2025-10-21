import { boardSize, dom, state } from "./context.js";
import { hideInviteModal, renderLobby } from "./lobby.js";
import { scrollChatToBottom, scrollLobbyChatToBottom, showToast, switchScreen } from "./ui.js";

export function buildBoard() {
  dom.board.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const cells = [];
  for (let y = 0; y < boardSize; y += 1) {
    const row = [];
    for (let x = 0; x < boardSize; x += 1) {
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
  if (!state.game) {
    state.game = { board: cells };
  } else {
    state.game.board = cells;
  }
  dom.board.appendChild(fragment);
}

export function determineMyMark(players) {
  if (!state.user) return null;
  if (players.x.id === state.user.id) return "x";
  if (players.o.id === state.user.id) return "o";
  return null;
}

export function getOpponentName() {
  if (!state.game || !state.user) return "";
  const opponent = Object.values(state.game.players).find((player) => player.id !== state.user.id);
  return opponent ? opponent.name : "đối thủ";
}

export function updatePlayersPanel() {
  if (!state.game) return;
  dom.playerNames.x.textContent = state.game.players.x.name;
  dom.playerNames.o.textContent = state.game.players.o.name;
  dom.playerStatus.x.textContent = state.game.turn === "x" ? "Đang tới lượt" : "Đang chờ";
  dom.playerStatus.o.textContent = state.game.turn === "o" ? "Đang tới lượt" : "Đang chờ";
  document.querySelectorAll(".player-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.mark === state.game.turn);
  });
}

export function updateTurnInfo(turn, deadlineMs) {
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

export function clearWinningHighlights() {
  dom.board.querySelectorAll(".board-cell.win").forEach((cell) => cell.classList.remove("win"));
}

export function onGameStart(message) {
  state.pendingInvites.clear();
  hideInviteModal();
  state.game = {
    id: message.gameId,
    board: Array.from({ length: boardSize }, () => Array(boardSize).fill("")),
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

export function onMoveResult(message) {
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

export function onSurrender(message) {
  if (!state.game) return;
  if (message.player) {
    const mark = String(message.player).toUpperCase();
    dom.gameStatus.textContent = `Người chơi ${mark} đã đầu hàng.`;
  }
}

export function onGameOver() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  dom.gameStatus.textContent = "Ván đấu đã kết thúc.";
}

export function onGameResult(message) {
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

export function onReturnToLobby() {
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
