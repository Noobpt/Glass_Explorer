[🇰🇷 한국어](README.md)

# GlassExplorer

![version](https://img.shields.io/badge/version-0.4.4-blue)
![platform](https://img.shields.io/badge/platform-Windows-0078D4)
![tauri](https://img.shields.io/badge/Tauri-2-FFC131)
![react](https://img.shields.io/badge/React-19-61DAFB)
![license](https://img.shields.io/badge/license-MIT-green)

A **glassmorphism folder launcher** for Windows — pin your favorite folders in a translucent always-on-top widget and open them in Explorer with a double-click.

<!--
  TODO: Add screenshot
  1. Capture a screenshot of the running app
  2. Save the image file to assets/ folder (e.g., assets/screenshot.png)
  3. Uncomment the line below and update the path

  ![GlassExplorer Screenshot](assets/screenshot.png)
-->

---

## Features

- **Favorite Folders** — Add, remove, rename, and reorder. Auto-saved as JSON.
- **Open in Explorer** — Double-click or right-click. Supports **New Tab** (COM API) and **New Window** modes.
- **Drag & Drop** — Drag folders from Explorer directly onto the widget.
- **Search / Filter** — `Ctrl+F` to search by folder name or path.
- **Path Validation** — Detects deleted or moved folders with a visual warning.
- **Glassmorphism UI** — Native Win32 Acrylic Blur + CSS translucent layers with shimmer animation.
- **Glass Controls** — Real-time sliders for Blur, Opacity, Refraction, and Depth.
- **Ghost Mode** — Toggle fully transparent background (folders only).
- **Always-on-Top** — Pin button to keep the widget above all windows.
- **Auto Start** — Register/unregister Windows startup via registry.
- **System Tray** — Show / Hide / Quit from tray icon. Double-click to restore.
- **Custom Title Bar** — Frameless window with drag, minimize, and close.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript 5.9 |
| Styling | Tailwind CSS 4.2 + Custom Glassmorphism CSS |
| Bundler | Vite 8 |
| Desktop | Tauri 2 |
| Backend | Rust (2021 edition) |
| Native Glass | window-vibrancy 0.6 |
| Win32 API | windows crate 0.58 |

---

## Requirements

- **Windows 10 1803+** (DWM Acrylic Blur support required)
- **Windows 11 22H2+** for Explorer tab feature (auto-fallback to new window on older versions)
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) toolchain
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

---

## Getting Started

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run tauri:dev
```

### Build for production
```bash
npm run tauri:build
```

Build output will be in `src-tauri/target/release/bundle/`:
- `msi/` — Windows Installer (.msi)
- `nsis/` — NSIS Setup (.exe)

---

## Download

Pre-built installers are available on the [Releases](../../releases) page.

---

## Data Storage

Favorites are stored as JSON at:
```
%AppData%\glass-explorer\favorites.json
```

---

## Project Structure
```
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── ControlPanel    # Glass sliders + Pin/Ghost/Add buttons
│   │   ├── DropZone        # Empty state drop area + Browse button
│   │   ├── FolderItem      # Folder row (open, rename, remove, context menu)
│   │   ├── FolderList      # Folder list + context menu rendering
│   │   ├── SearchBar       # Search input (150ms debounce, Ctrl+F)
│   │   └── TitleBar        # Custom titlebar (drag, minimize, close)
│   ├── lib/tauri.ts        # Type-safe IPC wrappers
│   ├── App.tsx             # Root component
│   └── types.ts            # TypeScript type definitions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── autostart.rs    # Windows registry auto-start
│   │   ├── error.rs        # Error types
│   │   ├── favorites.rs    # CRUD + JSON persistence
│   │   ├── folder_open.rs  # COM-based Explorer tab / new window
│   │   └── main.rs         # Tauri commands, tray, glass effect
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

---

## License

MIT
