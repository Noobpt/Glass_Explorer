#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod autostart;
mod error;
mod favorites;
mod folder_open;

use favorites::{FavoriteFolder, FavoritesStore};
use folder_open::OpenMode;
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconEvent,
    AppHandle, Manager, Runtime,
};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, clear_acrylic};

struct AppState {
    store: Mutex<FavoritesStore>,
    current_blur: Mutex<f64>,
    current_opacity: Mutex<f64>,
}

#[cfg(target_os = "windows")]
fn apply_glass<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>, blur: f64, opacity: f64) {
    if folder_open::get_windows_build_number() < 17134 {
        return;
    }
    let alpha = if opacity <= 0.0 {
        8_u8
    } else {
        let opacity = opacity.clamp(0.2, 1.0);
        let opacity_scale = 0.4 + (opacity - 0.2) / 0.8 * 0.6;
        if blur <= 0.0 {
            (240.0 * opacity_scale).round().clamp(0.0, 255.0) as u8
        } else {
            let blur = blur.clamp(1.0, 40.0);
            let t = (blur - 1.0) / 39.0;
            let tint_alpha = 210.0 - t * 140.0;
            (tint_alpha * opacity_scale).round().clamp(0.0, 255.0) as u8
        }
    };
    let _ = apply_acrylic(window, Some((15, 15, 20, alpha)));
}

fn restore_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn get_favorites(state: tauri::State<'_, AppState>) -> Vec<FavoriteFolder> {
    let store = state.store.lock().unwrap_or_else(|e| e.into_inner());
    store.favorites.clone()
}

#[tauri::command]
fn add_favorite(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<FavoriteFolder>, String> {
    let mut store = state.store.lock().unwrap_or_else(|e| e.into_inner());
    store.add(&path).map_err(|error| error.to_string())?;
    Ok(store.favorites.clone())
}

#[tauri::command]
fn remove_favorite(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<FavoriteFolder>, String> {
    let mut store = state.store.lock().unwrap_or_else(|e| e.into_inner());
    store.remove(&id).map_err(|e| e.to_string())?;
    Ok(store.favorites.clone())
}

#[tauri::command]
fn rename_favorite(id: String, new_name: String, state: tauri::State<'_, AppState>) -> Result<Vec<FavoriteFolder>, String> {
    let mut store = state.store.lock().unwrap_or_else(|e| e.into_inner());
    store.rename(&id, &new_name).map_err(|e| e.to_string())?;
    Ok(store.favorites.clone())
}

#[tauri::command]
fn reorder_favorites(
    ids: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<FavoriteFolder>, String> {
    let mut store = state.store.lock().unwrap_or_else(|e| e.into_inner());
    store.reorder(&ids).map_err(|e| e.to_string())?;
    Ok(store.favorites.clone())
}

#[tauri::command]
fn validate_paths(paths: Vec<String>) -> Vec<bool> {
    paths
        .iter()
        .map(|p| std::path::Path::new(p).exists())
        .collect()
}

#[tauri::command]
async fn open_folder(path: String, mode: OpenMode) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        folder_open::open_folder_in_explorer(&path, mode)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app
        .dialog()
        .file()
        .blocking_pick_folder();

    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
fn set_blur<R: Runtime>(
    app: AppHandle<R>,
    blur: f64,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    *state.current_blur.lock().unwrap_or_else(|e| e.into_inner()) = blur;

    #[cfg(target_os = "windows")]
    if let Some(window) = app.get_webview_window("main") {
        let opacity = *state.current_opacity.lock().unwrap_or_else(|e| e.into_inner());
        apply_glass(&window, blur, opacity);
    }

    Ok(())
}

#[tauri::command]
fn set_opacity<R: Runtime>(
    app: AppHandle<R>,
    opacity: f64,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    *state.current_opacity.lock().unwrap_or_else(|e| e.into_inner()) = opacity;

    #[cfg(target_os = "windows")]
    if let Some(window) = app.get_webview_window("main") {
        let blur = *state.current_blur.lock().unwrap_or_else(|e| e.into_inner());
        apply_glass(&window, blur, opacity);
    }

    Ok(())
}

#[tauri::command]
fn set_ghost<R: Runtime>(
    app: AppHandle<R>,
    enabled: bool,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    if let Some(window) = app.get_webview_window("main") {
        if enabled {
            let _ = clear_acrylic(&window);
        } else {
            let blur = *state.current_blur.lock().unwrap_or_else(|e| e.into_inner());
            let opacity = *state.current_opacity.lock().unwrap_or_else(|e| e.into_inner());
            apply_glass(&window, blur, opacity);
        }
    }

    Ok(())
}

#[tauri::command]
fn get_autostart() -> bool {
    autostart::get_autostart()
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    autostart::set_autostart(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_always_on_top<R: Runtime>(app: AppHandle<R>, enabled: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_always_on_top(enabled)
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn main() {
    let store = FavoritesStore::load().unwrap_or_default();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            store: Mutex::new(store),
            current_blur: Mutex::new(1.0),
            current_opacity: Mutex::new(0.6),
        })
        .invoke_handler(tauri::generate_handler![
            get_favorites,
            add_favorite,
            remove_favorite,
            rename_favorite,
            reorder_favorites,
            validate_paths,
            open_folder,
            pick_folder,
            set_blur,
            set_opacity,
            set_ghost,
            set_always_on_top,
            get_autostart,
            set_autostart,
        ])
        .setup(|app| {
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                apply_glass(&window, 1.0, 0.6);
            }

            let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
            let hide = MenuItemBuilder::with_id("hide", "Hide").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show)
                .item(&hide)
                .separator()
                .item(&quit)
                .build()?;

            if let Some(tray) = app.tray_by_id("main") {
                tray.set_menu(Some(menu))?;
                tray.on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => restore_main_window(app),
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });

                tray.on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::DoubleClick { .. } = event {
                        restore_main_window(&tray.app_handle());
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running GlassExplorer");
}
