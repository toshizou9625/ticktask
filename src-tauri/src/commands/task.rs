use tauri::AppHandle;

use crate::core::{store::Task, task_manager};
use crate::error::AppError;

#[tauri::command]
pub fn get_tasks(app: AppHandle) -> Result<Vec<Task>, AppError> {
    task_manager::get_tasks(&app)
}

#[tauri::command]
pub fn add_task(app: AppHandle, name: String) -> Result<Task, AppError> {
    task_manager::add_task(&app, name)
}

#[tauri::command]
pub fn delete_task(app: AppHandle, task_id: String) -> Result<(), AppError> {
    task_manager::delete_task(&app, &task_id)
}
