use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::DialogExt;

use crate::core::store;
use crate::error::AppError;
use crate::DialogOpenState;

#[tauri::command]
pub fn get_output_dir(app: AppHandle) -> Result<Option<String>, AppError> {
    store::load_output_dir(&app)
}

#[tauri::command]
pub fn set_output_dir(app: AppHandle, dir: String) -> Result<(), AppError> {
    store::save_output_dir(&app, &dir)
}

#[tauri::command]
pub async fn pick_folder<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, AppError> {
    // Signal that a dialog is open so focus-loss doesn't hide the window
    if let Some(state) = app.try_state::<DialogOpenState>() {
        state.0.store(true, Ordering::SeqCst);
    }

    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path);
    });

    let path = rx.await.map_err(|_| AppError::Store("Dialog closed".to_string()))?;

    // Clear the flag and restore window visibility
    if let Some(state) = app.try_state::<DialogOpenState>() {
        state.0.store(false, Ordering::SeqCst);
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }

    Ok(path.map(|p| p.to_string()))
}
