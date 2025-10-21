# Karo Frontend

Static client for the caro game, built with vanilla HTML/CSS/JS. (yes, VANILLA!!! muahahahahahaahdisaidjasdiasjd)
Demo: <https://karo.nytx.io.vn>

## Project layout

```text
public/
  index.html       # main document served to browsers
src/
  css/
    main.css       # imports the legacy stylesheet for now
  js/
    context.js     # dom + shared state wiring
    events.js      # DOM event bindings
    game.js        # board + gameplay helpers
    handlers.js    # websocket message routing
    lobby.js       # lobby utilities and invite flow
    chat.js        # chat rendering
    settings.js    # frontend configuration constants
    socket.js      # websocket connection helpers
    ui.js          # shared UI helpers (toasts, scrolling, etc.
    main.js        # entry point bootstrapping the modules
styles.css         # legacy stylesheet still referenced by main.css
```

## Quick start

Serve the `/public` directory (or the repo root) with any static file server. Examples use PowerShell:

```pwsh
Set-Location karo-fe
python -m http.server 5173
```

Then open `http://localhost:5173/public/` (or `http://localhost:5173` because of the redirect). The client expects the backend WebSocket at `ws://localhost:8000/ws`. Adjust `BACKEND_PORT` in `src/js/settings.js` if the backend runs elsewhere.

## Features

- Lobby with live user list, search debounce, and invite controls.
- Invite modal with 20s expiry countdown synced to server events.
- Responsive 17×17 board with turn indicator and soft animations.
- 30s turn timer display driven by server deadlines.
- Lightweight in-match chat with auto-scroll plus floating global lobby chat overlay.
- Toast notifications for errors, declines, wins, disconnects, and timeouts.
