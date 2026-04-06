use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

use crate::error::AppError;

// ─── Data models ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub name: String,
    #[serde(rename = "lastUsedAt")]
    pub last_used_at: Option<DateTime<Utc>>,
}

impl Task {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            last_used_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionState {
    #[serde(rename = "activeTaskId")]
    pub active_task_id: Option<String>,
    #[serde(rename = "startedAt")]
    pub started_at: Option<DateTime<Utc>>,
    #[serde(rename = "isPaused")]
    pub is_paused: bool,
    #[serde(rename = "todayAccumulated")]
    pub today_accumulated: HashMap<String, i64>,
}

// ─── Store keys ─────────────────────────────────────────────────────────────

const TASKS_KEY: &str = "tasks";
const OUTPUT_DIR_KEY: &str = "outputDir";
const SESSION_KEY: &str = "session";

// ─── Store operations ────────────────────────────────────────────────────────

pub fn load_tasks(app: &tauri::AppHandle) -> Result<Vec<Task>, AppError> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::Store(e.to_string()))?;
    let tasks = store
        .get(TASKS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    Ok(tasks)
}

pub fn save_tasks(app: &tauri::AppHandle, tasks: &[Task]) -> Result<(), AppError> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::Store(e.to_string()))?;
    store
        .set(TASKS_KEY, serde_json::to_value(tasks).unwrap());
    store.save().map_err(|e| AppError::Store(e.to_string()))?;
    Ok(())
}

pub fn load_output_dir(app: &tauri::AppHandle) -> Result<Option<String>, AppError> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::Store(e.to_string()))?;
    Ok(store
        .get(OUTPUT_DIR_KEY)
        .and_then(|v| serde_json::from_value(v).ok()))
}

pub fn save_output_dir(app: &tauri::AppHandle, dir: &str) -> Result<(), AppError> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::Store(e.to_string()))?;
    store.set(OUTPUT_DIR_KEY, serde_json::json!(dir));
    store.save().map_err(|e| AppError::Store(e.to_string()))?;
    Ok(())
}

pub fn load_session(app: &tauri::AppHandle) -> Result<SessionState, AppError> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::Store(e.to_string()))?;
    let session = store
        .get(SESSION_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    Ok(session)
}

pub fn save_session(app: &tauri::AppHandle, session: &SessionState) -> Result<(), AppError> {
    let store = app
        .store("store.json")
        .map_err(|e| AppError::Store(e.to_string()))?;
    store.set(SESSION_KEY, serde_json::to_value(session).unwrap());
    store.save().map_err(|e| AppError::Store(e.to_string()))?;
    Ok(())
}
