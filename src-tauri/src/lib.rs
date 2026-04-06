mod commands;
mod core;
mod error;

use commands::{settings, task, timer};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::Manager;

pub struct DialogOpenState(pub Arc<AtomicBool>);

static ICON_ACTIVE: &[u8] = include_bytes!("../icons/tray-active.png");
static ICON_PAUSED: &[u8] = include_bytes!("../icons/tray-paused.png");
static ICON_IDLE: &[u8]   = include_bytes!("../icons/tray-idle.png");

fn load_icon(bytes: &'static [u8]) -> tauri::image::Image<'static> {
    tauri::image::Image::from_bytes(bytes).expect("invalid icon")
}

/// Called from frontend after timer state changes.
#[tauri::command]
fn set_tray_state(app: tauri::AppHandle, state: String) {
    let icon = match state.as_str() {
        "active" => load_icon(ICON_ACTIVE),
        "paused" => load_icon(ICON_PAUSED),
        _        => load_icon(ICON_IDLE),
    };
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_icon(Some(icon));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            task::get_tasks,
            task::add_task,
            task::delete_task,
            timer::get_session,
            timer::start_task,
            timer::pause_task,
            timer::resume_task,
            timer::stop_all,
            settings::get_output_dir,
            settings::set_output_dir,
            settings::pick_folder,
            set_tray_state,
        ])
        .setup(|app| {
            let dialog_flag = Arc::new(AtomicBool::new(false));
            app.manage(DialogOpenState(dialog_flag.clone()));

            #[cfg(target_os = "macos")]
            {
                use tauri::ActivationPolicy;
                app.set_activation_policy(ActivationPolicy::Accessory);
            }

            let _tray = tauri::tray::TrayIconBuilder::with_id("main")
                .icon(load_icon(ICON_IDLE))
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            use tauri_plugin_global_shortcut::{
                Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
            };
            let shortcut = Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyT);
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })?;

            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                let flag = dialog_flag.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        if !flag.load(Ordering::SeqCst) {
                            let _ = win.hide();
                        }
                    }
                });
            }

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut seconds: u64 = 0;
                loop {
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    seconds += 1;
                    if seconds.is_multiple_of(300) {
                        let _ = core::time_tracker::periodic_backup(&app_handle);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
