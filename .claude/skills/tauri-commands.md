# Tauri v2 Command Patterns

## Command Definition (Rust)

```rust
#[tauri::command]
pub async fn command_name(
    arg: SomeType,
    state: tauri::State<'_, AppState>,
) -> Result<ReturnType, AppError> {
    // business logic call
    state.inner().do_something(arg).await
}
```

## Registration in main.rs

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .manage(AppState::new())
    .invoke_handler(tauri::generate_handler![
        commands::task::get_tasks,
        commands::task::add_task,
        commands::task::delete_task,
        commands::timer::start_task,
        commands::timer::pause_timer,
        commands::timer::stop_all,
        commands::settings::get_settings,
        commands::settings::set_output_dir,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

## Error Return Convention

All commands return `Result<T, AppError>`. Never return raw `String` errors.

```rust
pub async fn start_task(task_id: String, state: tauri::State<'_, AppState>) -> Result<SessionState, AppError> {
    let mut tracker = state.time_tracker.lock().await;
    tracker.start(task_id).await
}
```

## Frontend invoke Convention

```typescript
import { invoke } from "@tauri-apps/api/core";

const result = await invoke<ReturnType>("command_name", { argName: value });
```

Always use camelCase for argument names in `invoke` — Tauri converts snake_case Rust args to camelCase automatically.

## State Management Pattern

```rust
pub struct AppState {
    pub task_manager: Mutex<TaskManager>,
    pub time_tracker: Mutex<TimeTracker>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            task_manager: Mutex::new(TaskManager::new()),
            time_tracker: Mutex::new(TimeTracker::new()),
        }
    }
}
```

## Tauri v2 Breaking Changes vs v1

- `tauri::command` is the same but `State` is now `tauri::State<'_, T>`
- Plugin initialization uses `.plugin()` builder pattern
- `tauri-plugin-store` requires `StoreBuilder` or `app.store(path)`
- Window management uses `app.get_webview_window("label")` (not `get_window`)
- Tray is `tauri::tray::TrayIconBuilder` (built into core, no plugin needed)
