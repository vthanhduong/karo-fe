import { BOARD_SIZE } from "./settings.js";

export const state = {
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

export const dom = {
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

export const boardSize = BOARD_SIZE;
