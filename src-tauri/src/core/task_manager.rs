use chrono::Utc;

use crate::core::store::{self, Task};
use crate::error::AppError;

/// Return tasks sorted by MRU (lastUsedAt desc, then insertion order).
pub fn sorted_tasks(tasks: &[Task]) -> Vec<Task> {
    let mut sorted = tasks.to_vec();
    sorted.sort_by(|a, b| match (&b.last_used_at, &a.last_used_at) {
        (Some(bt), Some(at)) => bt.cmp(at),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => std::cmp::Ordering::Equal,
    });
    sorted
}

pub fn get_tasks(app: &tauri::AppHandle) -> Result<Vec<Task>, AppError> {
    let tasks = store::load_tasks(app)?;
    Ok(sorted_tasks(&tasks))
}

pub fn add_task(app: &tauri::AppHandle, name: impl Into<String>) -> Result<Task, AppError> {
    let mut tasks = store::load_tasks(app)?;
    let task = Task::new(name);
    tasks.push(task.clone());
    store::save_tasks(app, &tasks)?;
    Ok(task)
}

pub fn delete_task(app: &tauri::AppHandle, task_id: &str) -> Result<(), AppError> {
    let mut tasks = store::load_tasks(app)?;
    let before = tasks.len();
    tasks.retain(|t| t.id != task_id);
    if tasks.len() == before {
        return Err(AppError::TaskNotFound(task_id.to_string()));
    }
    store::save_tasks(app, &tasks)?;
    Ok(())
}

pub fn update_last_used(app: &tauri::AppHandle, task_id: &str) -> Result<(), AppError> {
    let mut tasks = store::load_tasks(app)?;
    let task = tasks
        .iter_mut()
        .find(|t| t.id == task_id)
        .ok_or_else(|| AppError::TaskNotFound(task_id.to_string()))?;
    task.last_used_at = Some(Utc::now());
    store::save_tasks(app, &tasks)?;
    Ok(())
}
