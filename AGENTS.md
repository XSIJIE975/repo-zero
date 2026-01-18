# AGENTS.md

This repo is a **Tauri v2** desktop app:
- **Frontend**: Vite + React + TypeScript (ESM)
- **Backend**: Rust (tauri commands in `src-tauri/`)

Use this doc as the default operating manual for agentic coding in this repository.

---

## Quick start

### Install deps
- Node deps (project uses **pnpm**; lockfile: `pnpm-lock.yaml`):
  - `pnpm install`

### Run (frontend only)
- `pnpm dev`
  - Runs Vite dev server (see `package.json` script `dev`) on http://localhost:1420 (per `src-tauri/tauri.conf.json`).

### Run (Tauri desktop)
- `pnpm tauri:dev`
  - Starts the Vite dev server and launches the Tauri app.

### Build
- Frontend bundle:
  - `pnpm build` (runs `tsc && vite build`)
- Packaged desktop app:
  - `pnpm tauri:build`

### Preview built frontend
- `pnpm preview`

---

## Lint / format / typecheck / tests

### Typecheck (actual)
- `pnpm build`
  - This repo uses `tsc --noEmit` (via `tsc`) as the effective TypeScript check.
  - TS settings are **strict** (see `tsconfig.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, etc.).

### Lint (currently NOT configured)
- No ESLint/Biome configuration detected.
- No `lint` script exists in `package.json`.

If you introduce linting, prefer adding it as a `pnpm lint` script and keep it fast.

### Format (currently NOT configured)
- No Prettier/Biome config detected.
- Rust formatting is available via the Rust toolchain:
  - `cargo fmt` (run from `src-tauri/`)

### Rust checks (ad-hoc)
From `src-tauri/`:
- Build/check:
  - `cargo check`
- Test (if/when added):
  - `cargo test`
- Clippy (if/when added):
  - `cargo clippy`

### Tests (currently NOT configured)
- No Jest/Vitest/Playwright/etc. detected.
- No `test` script exists in `package.json`.

#### Running a single test (guidance)
Because no test framework is installed yet, use these conventions if/when tests are added:
- **Vitest** (recommended for Vite):
  - single file: `pnpm vitest run src/foo.test.ts`
  - single test name: `pnpm vitest run -t "test name"`
- **Cargo** (Rust):
  - single test: `cargo test test_name`
  - single module: `cargo test module_name::`

---

## Repository layout

- `src/` frontend React/TS code
  - `src/App.tsx` main UI flow (invokes Tauri commands, listens for `log-event`).
  - `src/components/ui.tsx` shared UI primitives (shadcn-style).
  - `src/lib/utils.ts` shared utilities (e.g., `cn`).
- `src-tauri/` Rust backend
  - `src-tauri/src/lib.rs` Tauri commands and app setup
  - `src-tauri/src/main.rs` entrypoint
  - `src-tauri/tauri.conf.json` Tauri config (build commands, dev URL)
  - `src-tauri/capabilities/default.json` permissions/capabilities

---

## Code style guidelines

### General principles
- Prefer **small, focused changes**.
- Keep behavior changes minimal unless explicitly requested.
- Avoid adding new dependencies unless necessary.

### TypeScript / React

#### Type safety
- Keep TypeScript strictness intact (see `tsconfig.json`).
- Avoid weakening types or using unsafe escapes.

#### Imports
Observed patterns:
- ESM imports with double quotes are common in app code (e.g., `src/App.tsx`, `src/main.tsx`).
- `src/components/ui.tsx` uses no semicolons and double quotes, with a shadcn-style layout.

Guideline:
- Group imports roughly as:
  1) React/core libs
  2) third-party deps
  3) internal aliases (`@/...`)
  4) relative imports (`./...`)
- Prefer project aliases (`@/*`) over deep relative paths when importing from `src/`.
  - Alias mapping: `@/* -> ./src/*` (see `tsconfig.json`).

#### Formatting
- Prettier/Biome is not configured; follow nearby-file style.
- Existing code mixes semicolons vs no-semicolons. When editing a file:
  - Keep the file’s existing convention consistent.

#### Components / naming
- React components: `PascalCase`.
- Functions/variables: `camelCase`.
- Types:
  - Union “state machine” style is used in `App.tsx` (e.g., `type Step = ...`).
  - Interfaces used for data crossing boundary (`interface RepoInfo`).

#### Error handling
- In frontend, async actions use `try/catch/finally` (see `src/App.tsx`).
- Prefer:
  - User-facing failures: provide a clear message and keep UI consistent.
  - Developer visibility: `console.error` is currently used; keep it for now.

#### Tauri usage patterns
- Commands are invoked via:
  - `invoke<ReturnType>("command_name", { ...args })` (see `src/App.tsx`).
- Events are listened to via:
  - `listen<string>("log-event", handler)` with cleanup in `useEffect`.

### Rust (Tauri backend)

#### Formatting & idioms
- Code uses standard Rust formatting and 4-space indentation (see `src-tauri/src/lib.rs`).
- Prefer `Result<T, E>` returns from commands.

#### Tauri commands
- Commands are annotated with `#[tauri::command]` (see `src-tauri/src/lib.rs`).
- App is wired in `run()` via `.invoke_handler(tauri::generate_handler![...])`.

#### Error handling
- Current pattern: return `Result<_, String>` from commands.
  - Example: `async fn execute_reset(...) -> Result<(), String>`.
- When calling helpers, map errors with context:
  - `map_err(|e| format!("...: {}", e))?`

#### Process execution
- Git commands are executed via `std::process::Command` in `run_git_cmd`.
- Non-interactive behavior is enforced:
  - `GIT_TERMINAL_PROMPT=0` (see `src-tauri/src/lib.rs`).

#### Logging / UI feedback
- Backend emits progress messages via Tauri events:
  - `app.emit("log-event", msg)` (see `emit()` in `src-tauri/src/lib.rs`).
- Frontend appends log lines to a terminal-like view.

### Tailwind / shadcn UI
- Tailwind is configured via `tailwind.config.js`.
- shadcn config is in `components.json`.
- UI primitives live in `src/components/ui.tsx` with `cva` + `cn()`.

---

## Cursor / Copilot rules

- No Cursor rules found (`.cursor/rules/` and `.cursorrules` not present).
- No GitHub Copilot instructions found (`.github/copilot-instructions.md` not present).

---

## Suggested future additions (optional)

Not required for day-to-day edits, but helpful if you extend the repo:
- Add `pnpm lint` (ESLint) and `pnpm format` (Prettier/Biome).
- Add `pnpm test` (Vitest) for frontend; add Rust unit tests and `cargo test` in CI.
