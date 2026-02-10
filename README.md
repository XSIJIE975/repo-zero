<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="RepoZero logo" width="80" />
</p>

<h1 align="center">RepoZero</h1>

<p align="center">
  The nuclear option for bloated Git repositories.<br/>
  Reset history and branches with a beautiful GUI.
</p>

<p align="center">
  <a href="https://github.com/XSIJIE975/repo-zero/releases"><img src="https://img.shields.io/github/v/release/XSIJIE975/repo-zero?style=flat-square" alt="Latest release" /></a>
  <a href="https://github.com/XSIJIE975/repo-zero/blob/main/LICENSE"><img src="https://img.shields.io/github/license/XSIJIE975/repo-zero?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/XSIJIE975/repo-zero/releases"><img src="https://img.shields.io/github/downloads/XSIJIE975/repo-zero/total?style=flat-square" alt="Downloads" /></a>
</p>

<p align="center">
  <a href="README.zh-CN.md">中文文档</a>
</p>

---

## Overview

RepoZero is a cross-platform desktop app that completely resets a Git
repository's history. When your repo has accumulated years of commits,
branches, and tags — and a fresh start is the cleanest path forward —
RepoZero handles it in a guided, step-by-step wizard.

> **Warning:** This tool performs **irreversible** operations. All
> commit history, branches, and tags are permanently deleted from the
> remote repository.

## Features

- **Complete history reset** — removes all commits, branches, and tags
  from the remote
- **Smart default branch detection** — automatically detects the remote
  HEAD (`main`, `master`, or custom)
- **Safety-first workflow** — requires explicit typed confirmation
  before any destructive operation
- **Real-time log panel** — watch the cleanup process in a filterable,
  resizable terminal view
- **Cross-platform** — Windows (x64, x86), macOS (Apple Silicon), and
  Linux
- **Multi-language UI** — English and Chinese
- **Auto-update** — built-in updater notifies you when a new version
  is available
- **Theming** — light/dark mode with multiple accent color options

## Installation

Download the latest release for your platform from the
[Releases](https://github.com/XSIJIE975/repo-zero/releases) page.

| Platform              | Format                         |
|-----------------------|--------------------------------|
| Windows (x64)        | `.msi` or `.exe`               |
| Windows (x86)        | `.msi` or `.exe`               |
| macOS (Apple Silicon) | `.dmg`                         |
| Linux                | `.deb`, `.rpm`, or `.AppImage`  |

### Prerequisites

- **Git** >= 2.28 must be installed and available in your `PATH`
- A credential helper must be configured for remote authentication
  (for example, `git credential-manager` or SSH keys)

## Usage

RepoZero guides you through a five-step wizard:

1. **Connect** — select the local folder of the Git repository you
   want to reset.
2. **Analyze** — review repository metadata: remote URL, branch count,
   tag count, and estimated size.
3. **Confirm** — choose the target default branch, review the
   destructive actions, and type `nuclear reset` to confirm.
4. **Execute** — the reset runs in the background with real-time
   progress logging.
5. **Success** — done. Inform your team to re-clone the repository.

## How it works

RepoZero performs these operations under the hood:

1. Creates a temporary directory and initializes a clean Git
   repository.
2. Copies user name and email from the original repository
   configuration.
3. Creates an empty root commit
   (`Chore: repository reset and history cleanup`).
4. Force pushes the empty commit to the target default branch on
   `origin`.
5. Deletes all other remote branches and tags in batches.
6. Cleans up the temporary directory.

If any branch or tag deletion fails, RepoZero reports the warnings so
you can address them manually.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Platform-specific dependencies for
  [Tauri v2](https://v2.tauri.app/start/prerequisites/)

### Getting started

```bash
# Install dependencies
pnpm install

# Start the Tauri desktop app in development mode
pnpm tauri:dev

# Or run just the frontend dev server (no Rust backend)
pnpm dev
```

### Building

```bash
# Build the frontend bundle
pnpm build

# Build the packaged desktop app
pnpm tauri:build
```

### Project structure

```
repo-zero/
├── src/                      # Frontend (React + TypeScript)
│   ├── App.tsx               # Main wizard flow
│   ├── components/           # UI components (steps, panels, controls)
│   ├── hooks/                # Custom React hooks
│   ├── i18n/                 # Internationalization (en, zh-CN)
│   ├── lib/                  # Utilities (log store, theme, runtime)
│   └── types/                # TypeScript type definitions
├── src-tauri/                # Backend (Rust + Tauri v2)
│   ├── src/lib.rs            # Tauri commands (scan_repo, execute_reset)
│   ├── src/main.rs           # Entry point
│   ├── tauri.conf.json       # Tauri configuration
│   └── capabilities/         # Permission capabilities
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### Tech stack

| Layer      | Technology                               |
|------------|------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS |
| Backend    | Rust, Tauri v2                           |
| UI library | Radix UI, shadcn/ui, Lucide icons        |
| Terminal   | xterm.js                                 |
| i18n       | i18next, react-i18next                   |

### Available scripts

| Script             | Description                          |
|--------------------|--------------------------------------|
| `pnpm dev`         | Start Vite dev server                |
| `pnpm build`       | Typecheck and build frontend bundle  |
| `pnpm tauri:dev`   | Start Tauri desktop app (dev mode)   |
| `pnpm tauri:build` | Build packaged desktop app           |
| `pnpm lint`        | Run Biome linter                     |
| `pnpm lint:fix`    | Run Biome linter with auto-fix       |
| `pnpm format`      | Format code with Biome               |

## Contributing

Contributions are welcome. To get started:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-change`).
3. Make your changes and verify they build cleanly (`pnpm build`).
4. Open a pull request.

This project uses
[Changesets](https://github.com/changesets/changesets) for versioning.
If your change affects the public-facing app, run `pnpm changeset` to
document it.

## License

[MIT](LICENSE) — Copyright (c) 2026 XSIJIE975
