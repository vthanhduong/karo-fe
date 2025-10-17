# Karo Frontend

Static client for the caro game, built with vanilla HTML/CSS/JS.

## Quick start

Serve the folder with any static file server (examples use PowerShell):

```pwsh
Set-Location karo-fe
python -m http.server 5173
```

Then open `http://localhost:5173` in your browser. The client expects the backend WebSocket to be available at `ws://localhost:8000/ws`. Adjust the constant `BACKEND_PORT` in `scripts.js` if you run the backend on a different port.

## Features

- Lobby with live user list, search debounce, and invite controls.
- Invite modal with 20s expiry countdown synced to server events.
- Responsive 25×25 board with turn indicator and soft animations.
- 30s turn timer display driven by server deadlines.
- Lightweight in-match chat with auto-scroll.
- Toast notifications for errors, declines, wins, and disconnects.
