use chrono::{DateTime, Local, Utc};

use crate::core::store::{self, SessionState};
use crate::core::{markdown, task_manager};
use crate::error::AppError;

/// Start (or switch to) a task.
/// If another task is active, accumulate its time and write Markdown.
pub fn start_task(app: &tauri::AppHandle, task_id: &str) -> Result<SessionState, AppError> {
    let mut session = store::load_session(app)?;
    let now = Utc::now();

    // Accumulate time for the currently active task.
    if let (Some(active_id), Some(started_at)) =
        (&session.active_task_id.clone(), &session.started_at)
    {
        let elapsed = (now - *started_at).num_seconds().max(0);
        *session.today_accumulated.entry(active_id.clone()).or_insert(0) += elapsed;

        // Write Markdown for the day.
        if let Ok(Some(dir)) = store::load_output_dir(app) {
            let _ = write_markdown(app, &session, &dir, started_at);
        }
    }

    // Switch to the new task.
    session.active_task_id = Some(task_id.to_string());
    session.started_at = Some(now);
    session.is_paused = false;

    task_manager::update_last_used(app, task_id)?;
    store::save_session(app, &session)?;
    Ok(session)
}

pub fn pause_task(app: &tauri::AppHandle) -> Result<SessionState, AppError> {
    let mut session = store::load_session(app)?;
    if session.active_task_id.is_none() || session.is_paused {
        return Ok(session);
    }
    let now = Utc::now();
    if let (Some(active_id), Some(started_at)) =
        (&session.active_task_id.clone(), &session.started_at)
    {
        let elapsed = (now - *started_at).num_seconds().max(0);
        *session.today_accumulated.entry(active_id.clone()).or_insert(0) += elapsed;
    }
    session.started_at = None;
    session.is_paused = true;
    store::save_session(app, &session)?;
    Ok(session)
}

pub fn resume_task(app: &tauri::AppHandle) -> Result<SessionState, AppError> {
    let mut session = store::load_session(app)?;
    if !session.is_paused {
        return Ok(session);
    }
    session.started_at = Some(Utc::now());
    session.is_paused = false;
    store::save_session(app, &session)?;
    Ok(session)
}

pub fn stop_all(app: &tauri::AppHandle) -> Result<SessionState, AppError> {
    let mut session = store::load_session(app)?;
    let now = Utc::now();

    if let (Some(active_id), Some(started_at)) =
        (&session.active_task_id.clone(), &session.started_at)
    {
        let elapsed = (now - *started_at).num_seconds().max(0);
        *session.today_accumulated.entry(active_id.clone()).or_insert(0) += elapsed;

        if let Ok(Some(dir)) = store::load_output_dir(app) {
            let _ = write_markdown(app, &session, &dir, started_at);
        }
    }

    session.active_task_id = None;
    session.started_at = None;
    session.is_paused = false;

    store::save_session(app, &session)?;
    Ok(session)
}

/// Periodic backup: accumulate current interval, reset startedAt, no Markdown write.
pub fn periodic_backup(app: &tauri::AppHandle) -> Result<(), AppError> {
    let mut session = store::load_session(app)?;
    if session.is_paused || session.active_task_id.is_none() {
        return Ok(());
    }
    let now = Utc::now();
    if let (Some(active_id), Some(started_at)) =
        (&session.active_task_id.clone(), &session.started_at)
    {
        let elapsed = (now - *started_at).num_seconds().max(0);
        *session.today_accumulated.entry(active_id.clone()).or_insert(0) += elapsed;
    }
    session.started_at = Some(now);
    store::save_session(app, &session)?;
    Ok(())
}

pub fn get_session(app: &tauri::AppHandle) -> Result<SessionState, AppError> {
    store::load_session(app)
}

// ─── Markdown helper ─────────────────────────────────────────────────────────

fn write_markdown(
    app: &tauri::AppHandle,
    session: &SessionState,
    output_dir: &str,
    _started_at: &DateTime<Utc>,
) -> Result<(), AppError> {
    let tasks = store::load_tasks(app)?;
    let today = Local::now().format("%Y-%m-%d").to_string();
    let path = expand_home(output_dir);
    let file_path = format!("{}/{}.md", path, today);

    // Build a time map: task name -> accumulated seconds
    let mut time_map: Vec<(String, i64)> = Vec::new();
    for (id, &secs) in &session.today_accumulated {
        if secs == 0 {
            continue;
        }
        let name = tasks
            .iter()
            .find(|t| &t.id == id)
            .map(|t| t.name.clone())
            .unwrap_or_else(|| id.clone());

        if let Some(entry) = time_map.iter_mut().find(|(n, _)| n == &name) {
            entry.1 += secs;
        } else {
            time_map.push((name, secs));
        }
    }

    if time_map.is_empty() {
        return Ok(());
    }

    markdown::update_work_time_section(&file_path, &today, &time_map)
}

fn expand_home(path: &str) -> String {
    if path.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return format!("{}{}", home, &path[1..]);
        }
    }
    path.to_string()
}
