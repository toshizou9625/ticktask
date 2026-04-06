# TickTask — CLAUDE.md

> **TickTask** — Tick (time ticking) + Task = carving out your tasks in time

## Overview

A macOS menu bar app that automatically records how much time you spend on each task by letting you switch between tasks with a single click. Logs are saved to Markdown files viewable in Obsidian.

This project also serves as **educational material for a Claude Code study session**, intentionally exercising three features — Skills, Sub Agents, and Hooks — with the development experience presented as a slide talk.

---

## Concept

- **Zero friction** — just press a task button. No typing, no confirmation, no manual saving
- **Fully local** — no external servers or API calls. Work information never leaves the machine
- **Obsidian integration** — appends only a time-tracking section to the same daily note files

---

## Tech Stack

| Item | Details |
|---|---|
| Platform | macOS |
| Framework | Tauri v2 |
| UI | React + Tailwind CSS |
| Task list storage | tauri-plugin-store (app-local) |
| Time log storage | Markdown files (user-specified folder) |
| CI/CD | GitHub Actions |
| External communication | **None** |

### Tauri v2 Plugins

| Plugin | Purpose |
|---|---|
| `tauri-plugin-store` | Persist task list and session state |
| `tauri-plugin-global-shortcut` | Open/close popover via `⌘+Shift+T` |
| `tauri-plugin-dialog` | Native folder picker dialog in settings panel |
| Tray API (Tauri v2 core) | Menu bar residency, icon, title updates |

> Tray functionality is built into the Tauri v2 core API — no extra plugin needed.

---

## Functional Specifications

### Residency & Launch

- Resides in the menu bar
- Always shows current task name and elapsed time in the menu bar (e.g. `🔴 Design Doc Edit 0:42`)
- Global shortcut `⌘+Shift+T` opens/closes the popover from any app

### Task Operations

- One click on a task button starts tracking
- Switching to another task auto-stops and records the previous task
- Pause button suspends tracking (for breaks or interruptions)
- While paused: menu bar icon shows ⏸, task display in popover is grayed out

### Task List

- Auto-sorted by Most Recently Used (MRU)
- New tasks added via text input → automatically appended to list
- Tasks can be added/deleted from the settings panel (reordering is automatic only)

### End-of-Day Operation

- "Stop All" button stops the active task and writes the final Markdown entry
- Closing the popover does NOT stop tracking (prevents accidental stops)

### Settings Panel (minimal)

```
┌────────────────────┐
│ Edit Task List      │
├────────────────────┤
│ Requirements    [×] │
│ Design Doc Edit [×] │
│ Code Review     [×] │
├────────────────────┤
│ + ________________  │
├────────────────────┤
│ Save Folder         │
│ ~/Obsidian/Daily [📁]│
└────────────────────┘
```

- The `[📁]` button opens a native folder picker via `tauri-plugin-dialog`'s `open` API (directory mode)
- Selected path is saved to the store as `outputDir`

### First-Launch Onboarding

On first launch (when `outputDir` is not set in the store), show an onboarding screen instead of the popover.

```
┌──────────────────────────┐
│ Welcome to TickTask       │
├──────────────────────────┤
│                          │
│ Choose save folder        │
│ ~/Obsidian/Daily    [📁] │
│                          │
├──────────────────────────┤
│ Register common tasks     │
│ __________________ [Add]  │
│                          │
│  • Requirements      [×]  │
│  • Code Review       [×]  │
│                          │
├──────────────────────────┤
│       [Get Started]       │
└──────────────────────────┘
```

- "Get Started" button is disabled until a folder is selected
- Starting with zero tasks is fine (they can be added later)
- Pressing "Get Started" saves to store and transitions to the normal popover
- On subsequent launches, onboarding is skipped and the popover shows directly

---

## UI Layout

```
┌────────────────────────┐
│ 🔴 Design Doc Edit 0:42│  ← current task and elapsed time
├────────────────────────┤
│ [Requirements] [Design] │
│ [Code Review] [Meeting] │  ← task buttons (MRU order, max 8 shown)
├────────────────────────┤
│ 🔍 __________________ │  ← new task input (doubles as search)
├────────────────────────┤
│ ⏸ Pause  ⏹ Stop All  ⚙│
└────────────────────────┘
```

### Popover Size Constraints

- Fixed size: 320px wide, max 400px tall
- Task button area shows only the **top 8 MRU tasks** (2 columns × 4 rows)
- Tasks 9+ appear as incremental-search candidates when typing in the input field
- Clicking a candidate starts tracking that task (same UX as adding a new one)
- This keeps the popover size constant even with dozens of tasks

---

## Data Design

### Data Stored in tauri-plugin-store

Two types of data are managed in the store.

**① Task List (master data)**

```json
{
  "tasks": [
    { "id": "uuid-1", "name": "Requirements", "lastUsedAt": "2026-04-03T10:30:00" },
    { "id": "uuid-2", "name": "Design Doc Edit", "lastUsedAt": "2026-04-03T14:00:00" },
    { "id": "uuid-3", "name": "New Task", "lastUsedAt": null }
  ],
  "outputDir": "~/Obsidian/Daily"
}
```

- MRU sort is performed by `lastUsedAt` descending
- Tasks with `lastUsedAt: null` (never used) appear at the end in insertion order
- `lastUsedAt` is updated to the current time when tracking starts

**② Measurement Session State**

```json
{
  "activeTaskId": "uuid-2",
  "startedAt": "2026-04-03T14:00:00",
  "isPaused": false,
  "todayAccumulated": {
    "uuid-1": 5400,
    "uuid-2": 2700
  }
}
```

- `startedAt`: start of the current measurement interval (reset on resume; `null` while paused)
- `isPaused`: pause state flag (used for UI display control)
- `todayAccumulated`: daily accumulated seconds per task ID (incremented on pause/switch)

### Elapsed Time Calculation

Elapsed time = **`todayAccumulated` + current interval**.

- **Displayed elapsed time** = `todayAccumulated[taskId]` + (`now` - `startedAt`)
- **On pause**: add `now - startedAt` to `todayAccumulated[taskId]`, clear `startedAt`
- **On resume**: set `startedAt` to current time (`todayAccumulated` unchanged)
- **On switch**: same accumulation as pause, then set new task's `startedAt` to current time

**Example**: Start 10:00 → pause 10:30 (accumulated += 1800s) → resume 10:45 (startedAt = 10:45) → stop 11:15 (accumulated += 1800s) → total = 3600s = 1:00

### Save Timing (Event-Driven)

Store writes happen only on these events. No periodic saves.

| Event | Store write content |
|---|---|
| Task start | Session state (activeTaskId, startedAt) |
| Task switch | Previous task accumulated + new task startedAt + Markdown write |
| Pause | Accumulated + isPaused=true + clear startedAt |
| Resume | startedAt=now + isPaused=false |
| Stop All | Accumulated + reset session state + final Markdown write |
| Task list edit | Task list |
| App quit | Accumulated + Markdown write |
| Periodic backup (5 min) | Accumulated + reset startedAt (no Markdown write) |

**Crash risk and mitigation**: The interval from the last event to the crash (`startedAt` ~ crash time) is lost. Data already in `todayAccumulated` is preserved.

Mitigation: a **5-minute periodic backup** runs while tracking is active.

- Rust fires a timer every 5 minutes while `startedAt` is not `null`
- On fire: add current interval to `todayAccumulated`, reset `startedAt` to current time, save to store
- Maximum data loss is limited to 5 minutes
- Markdown writes are NOT done during periodic backup (event-driven only) to reduce file I/O frequency

---

## Markdown File Specification

### File Structure

```
{user-specified folder}/
├── 2026-04-03.md
├── 2026-04-02.md
└── ...
```

### File Format

```markdown
# 2026-04-03

Notes from this morning's standup: A shared an update.
Design doc review needed by next week.

---

## ⏱ Work Time

| Task | Time |
|------|------|
| Requirements | 1:30 |
| Design Doc Edit | 1:15 |
| Code Review | 0:45 |

Total: 3:30

---

Tomorrow's tasks

Respond to review comments
```

### Update Rules

- Only the `## ⏱ Work Time` section is auto-updated. The rest of the file is never touched.
- File does not exist → create new (see "New File Format" below)
- Section does not exist → append to end of file after a `---` separator
- Same-named tasks are merged (multiple pause/resume cycles appear as one row)
- Task order reflects the order first worked on that day
- Time format: `H:MM` (e.g. `1:30`, `0:45`)
- Update triggers: task switch, pause, stop all, app quit

### New File Format

When the file does not exist, the app creates it with:

```markdown
# 2026-04-03

---

## ⏱ Work Time

| Task | Time |
|------|------|
| Requirements | 0:30 |

Total: 0:30
```

- The `# YYYY-MM-DD` header is always generated by the app
- A `---` separator between the header and work time section leaves space for user notes
- If the user adds notes in Obsidian below the header, the app only updates the work time section — no interference

### Obsidian Conflict Prevention

Partial updates are performed in this order to avoid destroying user notes:

1. Read the entire file
2. Locate the start and end of the `## ⏱ Work Time` section (next `---`, `##`, or EOF)
3. Replace only that section with new content
4. Write the entire file back

Obsidian detects file changes and auto-reloads — no special integration needed.

### Midnight Rollover

Check the current date on task switch, pause, and stop all. Day boundary is **00:00:00 local time**.

If the date has changed:

1. Split the current interval: `startedAt` ~ `23:59:59` goes to the old date; `00:00:00` ~ now goes to the new date
2. Add the old-date portion to old `todayAccumulated` and write to the old-date Markdown file
3. Reset `todayAccumulated` for the new date and initialize it with the new-date seconds
4. All subsequent writes go to the new-date Markdown file

**Note**: Multi-day gaps (2+ days of no use) are out of scope. If abandoned for more than a day, all time is attributed to the last operation date (simplified implementation).

---

## Application Architecture

### Layer Structure

```
┌─────────────────────────────────────────┐
│              React UI Layer             │
│  Component rendering & user input       │
│  ※ No file I/O or Store operations here │
├─────────────────────────────────────────┤
│           Tauri Command Layer           │
│  Thin adapter: argument validation,     │
│  Rust layer calls, error conversion     │
├─────────────────────────────────────────┤
│            Rust Core Layer              │
│  All business logic:                    │
│  - Task management (CRUD, MRU sort)     │
│  - Time calculation (start/pause/resume/stop) │
│  - Markdown parser (section detect/replace)  │
│  - Store persistence                    │
├─────────────────────────────────────────┤
│           OS / File System              │
│  tauri-plugin-store, fs, tray,         │
│  global-shortcut, dialog               │
└─────────────────────────────────────────┘
```

### Directory Structure

```
ticktask/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/          # Tauri Command Layer (thin adapters)
│   │   │   ├── mod.rs
│   │   │   ├── task.rs        # Task CRUD commands
│   │   │   ├── timer.rs       # Start/stop/pause commands
│   │   │   └── settings.rs    # Settings commands
│   │   ├── core/              # Rust Core Layer (business logic)
│   │   │   ├── mod.rs
│   │   │   ├── task_manager.rs
│   │   │   ├── time_tracker.rs
│   │   │   ├── markdown.rs    # MD parser & update logic
│   │   │   └── store.rs       # Store operation abstraction
│   │   └── error.rs           # Unified error type
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── TaskBoard.tsx      # Task button list
│   │   ├── ActiveTask.tsx     # Current task & elapsed time display
│   │   ├── TaskInput.tsx      # New task input (+ incremental search)
│   │   ├── ControlBar.tsx     # Pause / Stop All / Settings buttons
│   │   ├── SettingsPanel.tsx  # Settings panel
│   │   └── Onboarding.tsx     # First-launch setup screen
│   ├── hooks/
│   │   ├── useTimer.ts        # Real-time elapsed time display
│   │   └── useTauriCommand.ts # Tauri invoke wrapper
│   └── lib/
│       └── types.ts           # Shared type definitions
├── docs/
│   └── SESSION-HANDOFF.md     # Auto-updated by Claude Code Stop hook
├── .github/
│   └── workflows/
│       ├── ci.yml             # PR / push: build + test
│       └── release.yml        # Tag push: build + GitHub Releases
├── .claude/skills/                    # Claude Code Skills
│   ├── tauri-commands.md
│   ├── markdown-format.md
│   ├── react-components.md
│   ├── architecture-review.md
│   └── github-actions-tauri.md
├── CLAUDE.md
├── package.json
└── tailwind.config.js
```

### Error Handling Policy

A unified error type is defined in Rust. All Commands return errors in a consistent format to the frontend.

```rust
// src-tauri/src/error.rs
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("File I/O error: {0}")]
    FileIO(#[from] std::io::Error),
    #[error("Store error: {0}")]
    Store(String),
    #[error("Markdown parse error: {0}")]
    MarkdownParse(String),
    #[error("Task not found: {0}")]
    TaskNotFound(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}
```

### State Management Policy (React Side)

React state is managed with `useContext` + `useReducer`. No external state management library is needed at this scale.

- **TimerContext**: current task ID, start time, pause state, today's accumulated time
- **TaskListContext**: task list, settings (output folder)

All Tauri Command invocations go through the `useTauriCommand` custom hook — components never call Tauri APIs directly.

---

## GitHub Actions

### Workflow Split

| File | Trigger | Content |
|---|---|---|
| `ci.yml` | PR, push to main | `cargo test` + `cargo clippy` + frontend build |
| `release.yml` | Tag push (`v*`) | Universal binary build + upload to GitHub Releases |

### Build Configuration

- Runner: `macos-latest`
- Target: `universal-apple-darwin` (Intel + Apple Silicon)
- Cache: Rust target cache by `Cargo.lock` hash + `node_modules` by `package-lock.json` hash
- Release: `tauri-apps/tauri-action` for build + artifact generation

### Signing & Notarization

Skipped at MVP stage. For production distribution, set the following GitHub Secrets (templates included as comments in `release.yml`):

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

---

## Claude Code Usage Policy

### Skills (Knowledge Injection)

Five Skill files referenced from CLAUDE.md give Claude Code project-specific knowledge.

```markdown
## Skills
### Implementation Guides
- Tauri command patterns: @.claude/skills/tauri-commands.md
- Markdown file format spec: @.claude/skills/markdown-format.md
- React component conventions: @.claude/skills/react-components.md
### Review & CI
- Architecture review checklist: @.claude/skills/architecture-review.md
- GitHub Actions build config: @.claude/skills/github-actions-tauri.md
```

**.claude/skills/tauri-commands.md** — Tauri v2 command definition patterns: `#[tauri::command]` syntax, `Result<T, AppError>` unified error returns, frontend `invoke` call conventions. Tauri v2 has significantly changed APIs — documenting correct patterns in Skills improves generation accuracy.

**.claude/skills/markdown-format.md** — Transcription of the "Markdown File Specification" section from this proposal. Includes section detection rules, update rules, conflict prevention steps.

**.claude/skills/react-components.md** — Component design policy: Tailwind CSS utility class usage, Tauri API call layer separation (components never invoke directly), `useContext` + `useReducer` state management patterns.

**.claude/skills/architecture-review.md** — Architecture reviewer role. Reviews the codebase against four criteria:
1. **Layer separation**: Does file I/O leak into React? Does the Command layer contain business logic?
2. **Error handling consistency**: Do all Commands return `AppError`? Is frontend error propagation unified?
3. **State management validity**: Is React state ownership clear? Any unnecessary prop drilling?
4. **Markdown update safety**: Read-before-write, section boundary detection accuracy, same-name task merging correctness

**.claude/skills/github-actions-tauri.md** — CI/CD configuration patterns: ci.yml vs release.yml split, cache key design, `tauri-apps/tauri-action` setup, signing template placement as comments.

### Sub Agents (Parallel Execution)

Independent tasks run in parallel via Sub Agents.

**Pattern 1: Frontend / Backend parallel**
- Main session: React UI component implementation
- Sub Agent A: Rust Markdown parser + file operation commands + unit tests

**Pattern 2: Implementation / Test parallel**
- Main session: continue feature implementation
- Sub Agent B: generate comprehensive edge case tests based on `.claude/skills/markdown-format.md`

**Pattern 3: Implementation / Review parallel**
- Main session: continue fixes
- Sub Agent C: review codebase against `.claude/skills/architecture-review.md` criteria → compile findings

### Hooks (Automated Control)

Lifecycle hooks configured in `.claude/settings.json`.

**PostToolUse: Auto-formatting**
- On `.rs` file edit → auto-run `cargo fmt`
- On `.tsx` / `.ts` file edit → auto-run `prettier --write`
- Eliminates Claude Code formatting inconsistencies and keeps diffs clean

**PreToolUse: Dangerous Command Blocking**
- Prevents unintended execution of `cargo publish`, `npm publish`, `rm -rf`, etc.
- Also useful for accident prevention during study sessions

**Stop: Session Handoff**
- Auto-updates `docs/SESSION-HANDOFF.md` on session end
- Claude Code reads the handoff file at next session start to resume smoothly from where it left off
- Practical when the study session spans multiple days

---

## Development Phases

### Phase 1: Project Foundation

**Goal**: Establish a state where Claude Code correctly understands the project context

1. Generate project with `create-tauri-app` (template: React + TypeScript)
2. Run `/init` to generate CLAUDE.md skeleton → add Skills references
3. Create 5 Skill files
4. Configure Hooks in `.claude/settings.json`
   - PostToolUse: `cargo fmt` / `prettier --write`
   - PreToolUse: block `cargo publish` / `npm publish` / `rm -rf`
   - Stop: auto-update `docs/SESSION-HANDOFF.md`
5. Create shared type definitions
   - `src-tauri/src/error.rs` — unified error type `AppError`
   - `src/lib/types.ts` — frontend type definitions (Task, SessionState, TimerContext, etc.)
6. Add Tauri plugin dependencies
   - Add `tauri-plugin-store`, `tauri-plugin-global-shortcut`, `tauri-plugin-dialog` to `Cargo.toml`
   - Configure the `plugins` section in `tauri.conf.json`

**Phase 1 completion criteria**: `cargo build` and `npm run dev` pass; an empty popover window appears

### Phase 2: Core Features (Sub Agent parallel)

**Goal**: Task operations and Markdown recording work in a local window

**Main session: React UI** — implement components in order:
1. `TimerContext` / `TaskListContext` Provider definitions (`useContext` + `useReducer`)
2. `Onboarding.tsx`
3. `ActiveTask.tsx`
4. `TaskBoard.tsx`
5. `TaskInput.tsx`
6. `ControlBar.tsx`
7. `SettingsPanel.tsx`

**Sub Agent A: Rust Core Layer** — implement in order:
1. `core/store.rs`
2. `core/task_manager.rs`
3. `core/time_tracker.rs`
4. `core/markdown.rs`
5. Unit tests for each module (especially `markdown.rs` edge cases)
6. `commands/task.rs`, `commands/timer.rs`, `commands/settings.rs`

**Phase 2 completion criteria**: Task operations work in a normal window; Markdown files are correctly output to the specified folder

### Phase 3: Menu Bar Residency

**Goal**: App runs as a menu bar resident

1. Tray setup with Tauri v2 core Tray API (SF Symbol `timer` icon)
2. Popover window (320×400px fixed, no decorations, auto-hide on focus loss)
3. Global shortcut `⌘+Shift+T` via `tauri-plugin-global-shortcut`
4. Folder picker dialog connected to `[📁]` buttons via `tauri-plugin-dialog`
5. Real-time tray title update (1-second interval from Rust timer, bypasses frontend)

**Phase 3 completion criteria**: All operations complete from the menu bar; popover accessible from any app via `⌘+Shift+T`

### Phase 4: CI/CD

**Goal**: Automated tests on PR; release binary generated on tag push

1. Build `ci.yml`: PR/push to main → cargo test + cargo clippy + frontend build
2. Build `release.yml`: `v*` tag → universal binary build via `tauri-apps/tauri-action` + GitHub Releases upload (signing/notarization templates as comments)

**Phase 4 completion criteria**: CI passes on PR; pushing `v0.1.0` tag auto-generates `.dmg` in GitHub Releases

### Phase 5: Quality Assurance

**Goal**: Verify architectural consistency and bring to release quality

1. **Architecture review** (Sub Agent) — scan all files against `.claude/skills/architecture-review.md` 4 criteria; compile findings in `docs/REVIEW-FINDINGS.md`
2. **Fix findings** — resolve layer violations and error handling gaps
3. **Manual test scenarios** — cover all flows including midnight rollover, crash recovery, incremental search for 9+ tasks
4. **Final build verification** — push `v0.1.0` tag, download `.dmg` from GitHub Releases, install and verify

**Phase 5 completion criteria**: All review findings resolved; all manual test scenarios pass
