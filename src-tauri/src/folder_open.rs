use crate::error::AppError;
use serde::Deserialize;

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OpenMode {
    NewTab,
    NewWindow,
}

#[cfg(target_os = "windows")]
use std::{collections::HashSet, time::Duration};

#[cfg(target_os = "windows")]
use windows::{
    core::{IUnknown, Interface, BSTR, VARIANT},
    Win32::{
        Foundation::HWND,
        System::Com::{
            CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_LOCAL_SERVER,
            COINIT_APARTMENTTHREADED,
        },
        UI::{
            Input::KeyboardAndMouse::{
                SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
                KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_CONTROL, VK_T,
            },
            Shell::{IShellWindows, IWebBrowser2, ShellWindows},
            WindowsAndMessaging::{
                GetForegroundWindow, SetForegroundWindow, ShowWindow, SW_RESTORE,
            },
        },
    },
};

#[cfg(target_os = "windows")]
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
struct ComIdentity(usize);

#[cfg(target_os = "windows")]
#[derive(Clone)]
struct ExplorerTabSnapshot {
    hwnd: HWND,
    identity: ComIdentity,
    browser: IWebBrowser2,
    location_url: String,
}

#[cfg(target_os = "windows")]
/// Windows 빌드 번호를 레지스트리에서 읽어 반환. 실패 시 0 반환.
pub fn get_windows_build_number() -> u32 {
    use windows::{
        Win32::System::Registry::{
            RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_LOCAL_MACHINE, KEY_READ, REG_SZ,
        },
        core::PCWSTR,
    };

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    let key_path = to_wide(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
    let value_name = to_wide("CurrentBuildNumber");
    let mut hkey = windows::Win32::System::Registry::HKEY::default();

    unsafe {
        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(key_path.as_ptr()),
            0,
            KEY_READ,
            &mut hkey,
        )
        .is_err()
        {
            return 0;
        }

        let mut buf = [0u8; 64];
        let mut buf_len = buf.len() as u32;
        let mut reg_type = REG_SZ;
        let ok = RegQueryValueExW(
            hkey,
            PCWSTR(value_name.as_ptr()),
            None,
            Some(&mut reg_type),
            Some(buf.as_mut_ptr()),
            Some(&mut buf_len),
        );
        let _ = RegCloseKey(hkey);

        if ok.is_err() {
            return 0;
        }

        let wide_slice = std::slice::from_raw_parts(
            buf.as_ptr() as *const u16,
            (buf_len as usize) / 2,
        );
        let s = String::from_utf16_lossy(wide_slice)
            .trim_end_matches('\0')
            .to_string();

        s.parse::<u32>().unwrap_or(0)
    }
}

#[cfg(target_os = "windows")]
fn is_explorer_tabs_supported() -> bool {
    get_windows_build_number() >= 22621
}

#[cfg(target_os = "windows")]
/// 폴더 열기. New Tab 실패 시 자동으로 New Window fallback.
/// 반환값이 true면 fallback이 발생했다는 뜻.
pub fn open_folder_in_explorer(path: &str, mode: OpenMode) -> Result<bool, AppError> {
    match mode {
        OpenMode::NewWindow => {
            open_folder_in_new_window(path)?;
            Ok(false)
        }
        OpenMode::NewTab => {
            if !is_explorer_tabs_supported() {
                open_folder_in_new_window(path)?;
                return Ok(true);
            }
            match open_folder_in_new_tab(path) {
                Ok(()) => Ok(false),
                Err(_e) => {
                    open_folder_in_new_window(path)?;
                    Ok(true)
                }
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn open_folder_in_new_window(path: &str) -> Result<(), AppError> {
    std::process::Command::new("explorer.exe")
        .arg(path)
        .spawn()?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_folder_in_new_tab(path: &str) -> Result<(), AppError> {
    let path = path.to_string();
    let handle = std::thread::spawn(move || -> Result<(), AppError> {
        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok()?;
            let result = try_open_folder_in_new_tab(&path);
            CoUninitialize();
            result
        }
    });
    handle.join().map_err(|_| AppError::FolderOpenError("COM thread panicked".to_string()))??;
    Ok(())
}

#[cfg(target_os = "windows")]
unsafe fn try_open_folder_in_new_tab(path: &str) -> Result<(), AppError> {
    let explorer_window = match find_explorer_window()? {
        Some(hwnd) => hwnd,
        None => return open_folder_in_new_window(path),
    };

    let initial_tabs = snapshot_explorer_tabs(Some(explorer_window))?;
    focus_explorer_window(explorer_window)?;

    for _ in 0..10 {
        std::thread::sleep(Duration::from_millis(80));
        if GetForegroundWindow() == explorer_window {
            break;
        }
        focus_explorer_window(explorer_window)?;
    }
    send_ctrl_t()?;

    let new_tab = wait_for_new_tab(explorer_window, &initial_tabs)?;
    navigate_tab_to_path(&new_tab.browser, path)?;
    wait_for_tab_navigation(explorer_window, new_tab.identity, path)?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn keyboard_input(key: VIRTUAL_KEY, flags: KEYBD_EVENT_FLAGS) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: key,
                dwFlags: flags,
                ..Default::default()
            },
        },
    }
}

#[cfg(target_os = "windows")]
unsafe fn send_inputs(inputs: &[INPUT]) -> Result<(), AppError> {
    let sent = SendInput(inputs, std::mem::size_of::<INPUT>() as i32);
    if sent != inputs.len() as u32 {
        return Err(AppError::FolderOpenError(
            "failed to send keyboard input".to_string(),
        ));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
unsafe fn send_ctrl_t() -> Result<(), AppError> {
    send_inputs(&[
        keyboard_input(VK_CONTROL, Default::default()),
        keyboard_input(VK_T, Default::default()),
        keyboard_input(VK_T, KEYEVENTF_KEYUP),
        keyboard_input(VK_CONTROL, KEYEVENTF_KEYUP),
    ])
}

#[cfg(target_os = "windows")]
unsafe fn snapshot_explorer_tabs(
    target_hwnd: Option<HWND>,
) -> Result<Vec<ExplorerTabSnapshot>, AppError> {
    let shell_windows: IShellWindows = CoCreateInstance(&ShellWindows, None, CLSCTX_LOCAL_SERVER)?;
    let count = shell_windows.Count()?;
    let mut tabs = Vec::new();

    for index_value in 0..count {
        let index = VARIANT::from(index_value);
        let dispatch = match shell_windows.Item(&index) {
            Ok(dispatch) => dispatch,
            Err(_) => continue,
        };
        let browser = match dispatch.cast::<IWebBrowser2>() {
            Ok(browser) => browser,
            Err(_) => continue,
        };
        let full_name = match browser.FullName() {
            Ok(full_name) => full_name.to_string().to_ascii_lowercase(),
            Err(_) => continue,
        };
        if !full_name.ends_with("explorer.exe") {
            continue;
        }

        let raw_hwnd = match browser.HWND() {
            Ok(hwnd) => hwnd,
            Err(_) => continue,
        };
        let hwnd = HWND(raw_hwnd.0 as *mut core::ffi::c_void);
        if hwnd.0.is_null() {
            continue;
        }
        if target_hwnd.is_some() && target_hwnd != Some(hwnd) {
            continue;
        }

        tabs.push(ExplorerTabSnapshot {
            hwnd,
            identity: browser_identity(&browser)?,
            location_url: browser
                .LocationURL()
                .map(|location| location.to_string())
                .unwrap_or_default(),
            browser,
        });
    }

    Ok(tabs)
}

#[cfg(target_os = "windows")]
unsafe fn browser_identity(browser: &IWebBrowser2) -> Result<ComIdentity, AppError> {
    Ok(ComIdentity(browser.cast::<IUnknown>()?.as_raw() as usize))
}

#[cfg(target_os = "windows")]
unsafe fn find_explorer_window() -> Result<Option<HWND>, AppError> {
    let foreground = GetForegroundWindow();
    let tabs = snapshot_explorer_tabs(None)?;
    let mut first_match = None;

    for tab in tabs {
        if first_match.is_none() {
            first_match = Some(tab.hwnd);
        }
        if tab.hwnd == foreground {
            return Ok(Some(tab.hwnd));
        }
    }

    Ok(first_match)
}

#[cfg(target_os = "windows")]
unsafe fn focus_explorer_window(hwnd: HWND) -> Result<(), AppError> {
    let _ = ShowWindow(hwnd, SW_RESTORE);
    if !SetForegroundWindow(hwnd).as_bool() {
        return Err(AppError::FolderOpenError(
            "failed to bring Explorer to the foreground".to_string(),
        ));
    }

    std::thread::sleep(Duration::from_millis(150));
    if GetForegroundWindow() != hwnd {
        return Err(AppError::FolderOpenError(
            "Explorer did not receive focus".to_string(),
        ));
    }

    Ok(())
}

#[cfg(target_os = "windows")]
unsafe fn wait_for_new_tab(
    hwnd: HWND,
    existing_tabs: &[ExplorerTabSnapshot],
) -> Result<ExplorerTabSnapshot, AppError> {
    let existing_identities: HashSet<ComIdentity> =
        existing_tabs.iter().map(|tab| tab.identity).collect();

    for _ in 0..30 {
        std::thread::sleep(Duration::from_millis(80));
        let current_tabs = snapshot_explorer_tabs(Some(hwnd))?;
        if let Some(new_tab) = current_tabs
            .into_iter()
            .find(|tab| !existing_identities.contains(&tab.identity))
        {
            return Ok(new_tab);
        }
    }

    Err(AppError::FolderOpenError(
        "New Tab failed: Explorer did not expose a new tab session after Ctrl+T.".to_string(),
    ))
}

#[cfg(target_os = "windows")]
unsafe fn navigate_tab_to_path(browser: &IWebBrowser2, path: &str) -> Result<(), AppError> {
    let target_path = VARIANT::from(BSTR::from(path_to_native_navigation_target(path)));
    let flags = VARIANT::default();
    let target_frame = VARIANT::default();
    let post_data = VARIANT::default();
    let headers = VARIANT::default();

    browser.Navigate2(
        &target_path as *const _,
        Some(&flags as *const _),
        Some(&target_frame as *const _),
        Some(&post_data as *const _),
        Some(&headers as *const _),
    )?;

    Ok(())
}

#[cfg(target_os = "windows")]
unsafe fn wait_for_tab_navigation(
    hwnd: HWND,
    identity: ComIdentity,
    path: &str,
) -> Result<(), AppError> {
    let expected_path = normalize_windows_path_like(path);
    let mut last_location = String::new();

    for _ in 0..40 {
        std::thread::sleep(Duration::from_millis(100));
        let current_tabs = snapshot_explorer_tabs(Some(hwnd))?;
        if let Some(tab) = current_tabs
            .into_iter()
            .find(|tab| tab.identity == identity)
        {
            last_location = tab.location_url;
            if normalize_windows_path_like(&last_location) == expected_path {
                return Ok(());
            }
        }
    }

    let last_location = if last_location.is_empty() {
        "Explorer home or an unknown location".to_string()
    } else {
        last_location
    };
    Err(AppError::FolderOpenError(format!(
        "New Tab failed: Explorer created a tab but did not reach the requested path. Expected `{path}`, last reported location was `{last_location}`."
    )))
}

#[cfg(target_os = "windows")]
fn path_to_native_navigation_target(path: &str) -> String {
    let decoded = decode_file_url_path(path).unwrap_or_else(|| path.to_string());
    let trimmed = decoded.trim().trim_matches('"');
    let without_device_prefix = trimmed.strip_prefix(r"\\?\").unwrap_or(trimmed);
    let mut normalized = without_device_prefix.replace('/', "\\");

    while normalized.len() > 3 && normalized.ends_with('\\') {
        normalized.pop();
    }

    normalized
}

#[cfg(target_os = "windows")]
fn normalize_windows_path_like(value: &str) -> String {
    let decoded = decode_file_url_path(value).unwrap_or_else(|| value.to_string());
    let trimmed = decoded.trim().trim_matches('"');
    let without_device_prefix = trimmed.strip_prefix(r"\\?\").unwrap_or(trimmed);
    let mut normalized = without_device_prefix.replace('/', "\\");

    while normalized.len() > 3 && normalized.ends_with('\\') {
        normalized.pop();
    }

    normalized.to_ascii_lowercase()
}

#[cfg(target_os = "windows")]
fn decode_file_url_path(value: &str) -> Option<String> {
    let lower = value.to_ascii_lowercase();
    if lower.starts_with("file:///") {
        return Some(percent_decode(&value[8..]).replace('/', "\\"));
    }
    if lower.starts_with("file://localhost/") {
        return Some(percent_decode(&value[17..]).replace('/', "\\"));
    }
    if lower.starts_with("file://") {
        return Some(format!(
            r"\\{}",
            percent_decode(&value[7..]).replace('/', "\\")
        ));
    }

    None
}

#[cfg(target_os = "windows")]
fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let (Some(high), Some(low)) =
                (hex_value(bytes[index + 1]), hex_value(bytes[index + 2]))
            {
                decoded.push((high << 4) | low);
                index += 3;
                continue;
            }
        }

        decoded.push(bytes[index]);
        index += 1;
    }

    String::from_utf8_lossy(&decoded).into_owned()
}

#[cfg(target_os = "windows")]
fn hex_value(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

#[cfg(not(target_os = "windows"))]
pub fn open_folder_in_explorer(
    _path: &str,
    _mode: OpenMode,
) -> Result<bool, AppError> {
    Err(AppError::FolderOpenError(
        "GlassExplorer is Windows-only".to_string(),
    ))
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::{normalize_windows_path_like, path_to_native_navigation_target};

    #[test]
    fn normalizes_file_urls_with_spaces() {
        assert_eq!(
            normalize_windows_path_like("file:///C:/Users/test/My%20Folder/"),
            normalize_windows_path_like(r"C:\Users\test\My Folder"),
        );
    }

    #[test]
    fn normalizes_utf8_file_urls() {
        assert_eq!(
            normalize_windows_path_like("file:///C:/Users/test/%ED%95%9C%EA%B8%80"),
            normalize_windows_path_like("C:\\Users\\test\\\u{D55C}\u{AE00}"),
        );
    }

    #[test]
    fn normalizes_localhost_file_urls() {
        assert_eq!(
            normalize_windows_path_like("file://localhost/C:/Users/test/Desktop"),
            normalize_windows_path_like(r"C:\Users\test\Desktop"),
        );
    }

    #[test]
    fn trims_quotes_and_extended_length_prefixes() {
        assert_eq!(
            normalize_windows_path_like("\"\\\\?\\C:\\Users\\test\\Desktop\\\\\""),
            normalize_windows_path_like(r"C:\Users\test\Desktop"),
        );
    }

    #[test]
    fn preserves_drive_roots_while_trimming_other_trailing_slashes() {
        assert_eq!(normalize_windows_path_like("file:///C:/"), r"c:\");
        assert_eq!(
            normalize_windows_path_like(r"C:\Users\test\Desktop\\"),
            r"c:\users\test\desktop",
        );
    }

    #[test]
    fn normalizes_unc_file_urls() {
        assert_eq!(
            normalize_windows_path_like("file://server/share/%ED%95%9C%EA%B8%80/Folder/"),
            normalize_windows_path_like(r"\\server\share\한글\Folder"),
        );
    }

    #[test]
    fn keeps_native_unicode_path_for_navigation() {
        assert_eq!(
            path_to_native_navigation_target(
                r#"\\?\X:\Project\P99_몽검 리막\03_Source\01_Footage\"#
            ),
            r"X:\Project\P99_몽검 리막\03_Source\01_Footage",
        );
        assert_eq!(
            path_to_native_navigation_target("file:///X:/Project/P99_%EB%AA%BD%EA%B2%80%20%EB%A6%AC%EB%A7%89/03_Source/01_Footage"),
            r"X:\Project\P99_몽검 리막\03_Source\01_Footage",
        );
    }
}
