use tauri::AppHandle;

use crate::core::{store::SessionState, time_tracker};
use crate::error::AppError;

#[tauri::command]
pub fn get_session(app: AppHandle) -> Result<SessionState, AppError> {
    time_tracker::get_session(&app)
}

#[tauri::command]
pub fn start_task(app: AppHandle, task_id: String) -> Result<SessionState, AppError> {
    time_tracker::start_task(&app, &task_id)
}

#[tauri::command]
pub fn pause_task(app: AppHandle) -> Result<SessionState, AppError> {
    time_tracker::pause_task(&app)
}

#[tauri::command]
pub fn resume_task(app: AppHandle) -> Result<SessionState, AppError> {
    time_tracker::resume_task(&app)
}

#[tauri::command]
pub fn stop_all(app: AppHandle) -> Result<SessionState, AppError> {
    time_tracker::stop_all(&app)
}
