# React Component Conventions

## Component Directory Structure

```
src/
├── App.tsx                    # Root: context providers + view routing
├── components/
│   ├── TaskBoard.tsx          # Grid of task buttons (MRU top 8)
│   ├── ActiveTask.tsx         # Current task name + elapsed time header
│   ├── TaskInput.tsx          # New task input + incremental search
│   ├── ControlBar.tsx         # Pause / Stop All / Settings buttons
│   ├── SettingsPanel.tsx      # Task list editor + folder picker
│   └── Onboarding.tsx         # First-launch setup screen
├── hooks/
│   ├── useTimer.ts            # Real-time 1s tick for elapsed display
│   └── useTauriCommand.ts     # Typed invoke wrapper
└── lib/
    └── types.ts               # Shared TypeScript types
```

## State Management

Use `useContext` + `useReducer`. No external libraries.

```tsx
// Two contexts:
// 1. TimerContext — active task, startedAt, isPaused, todayAccumulated
// 2. TaskListContext — tasks[], outputDir

// Provider wraps the whole app in App.tsx
<TaskListProvider>
  <TimerProvider>
    <MainView />
  </TimerProvider>
</TaskListProvider>
```

## Tauri API Rule

**Components NEVER call `invoke` directly.** All Tauri calls go through `useTauriCommand`.

```tsx
// BAD
import { invoke } from "@tauri-apps/api/core";
const tasks = await invoke("get_tasks");

// GOOD
const { getTasks, startTask } = useTauriCommand();
const tasks = await getTasks();
```

## Tailwind CSS Usage

- Use utility classes exclusively; no custom CSS files (except index.css for @import)
- Fixed popover size: `w-80` (320px), `max-h-96` (384px ≈ 400px max)
- Color palette: use slate/gray for backgrounds, red for active recording indicator
- Active task indicator: `🔴` emoji prefix

## Component Patterns

### Task Button

```tsx
<button
  key={task.id}
  onClick={() => onTaskClick(task.id)}
  className={`
    px-3 py-2 rounded text-sm font-medium truncate
    ${activeTaskId === task.id
      ? "bg-red-500 text-white"
      : "bg-slate-100 hover:bg-slate-200 text-slate-800"}
  `}
>
  {task.name}
</button>
```

### Elapsed Time Display

```tsx
// useTimer hook provides formatted string
const { elapsedDisplay } = useTimer(); // e.g. "0:42"
```

### Settings Panel Toggle

```tsx
const [showSettings, setShowSettings] = useState(false);
// SettingsPanel replaces main view when open
{showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : <MainPopover />}
```

## Props Convention

- Use `interface` for props types
- Keep props minimal — read from context when possible
- Callback props named `onXxx`

```tsx
interface TaskBoardProps {
  onTaskClick: (taskId: string) => void;
}
```
