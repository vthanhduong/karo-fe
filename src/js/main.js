import { dom } from "./context.js";
import { registerEventListeners } from "./events.js";
import { renderLobby } from "./lobby.js";
import { initializeAutoScrollWatchers, setLobbyChatCollapsed } from "./ui.js";

function initLobbyChatToggleState() {
  if (dom.lobbyChat && dom.lobbyChatToggle) {
    setLobbyChatCollapsed(false);
  }
}

function bootstrap() {
  initializeAutoScrollWatchers();
  registerEventListeners();
  renderLobby();
  initLobbyChatToggleState();
}

bootstrap();
