use crate::error::AppError;

#[cfg(target_os = "windows")]
mod win {
    use crate::error::AppError;
    use windows::{
        Win32::Foundation::ERROR_FILE_NOT_FOUND,
        Win32::System::Registry::{
            RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW,
            HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE, REG_SZ,
        },
        core::PCWSTR,
    };

    const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const APP_NAME: &str = "GlassExplorer";

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn get_autostart() -> bool {
        let key_wide = to_wide(RUN_KEY);
        let mut hkey = windows::Win32::System::Registry::HKEY::default();
        let err = unsafe {
            RegOpenKeyExW(HKEY_CURRENT_USER, PCWSTR(key_wide.as_ptr()), 0, KEY_READ, &mut hkey)
        };
        if err.is_err() {
            return false;
        }
        let value_name = to_wide(APP_NAME);
        let ok = unsafe {
            RegQueryValueExW(hkey, PCWSTR(value_name.as_ptr()), None, None, None, None).is_ok()
        };
        unsafe { let _ = RegCloseKey(hkey); }
        ok
    }

    pub fn set_autostart(enabled: bool) -> Result<(), AppError> {
        let key_wide = to_wide(RUN_KEY);
        let mut hkey = windows::Win32::System::Registry::HKEY::default();
        unsafe {
            RegOpenKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR(key_wide.as_ptr()),
                0,
                KEY_SET_VALUE,
                &mut hkey,
            )
            .ok()
            .map_err(|e| AppError::RegistryError(e.to_string()))?;
        }

        let value_name = to_wide(APP_NAME);
        let result = if enabled {
            let exe = std::env::current_exe()?;
            let exe_str = exe.to_string_lossy();
            if exe_str.contains("target\\debug") || exe_str.contains("target\\release") {
                unsafe { let _ = RegCloseKey(hkey); }
                return Err(AppError::RegistryError(
                    "개발 빌드에서는 자동 시작을 등록할 수 없습니다".to_string(),
                ));
            }
            let exe_wide = to_wide(&exe_str);
            let data = unsafe {
                std::slice::from_raw_parts(exe_wide.as_ptr() as *const u8, exe_wide.len() * 2)
            };
            unsafe {
                RegSetValueExW(hkey, PCWSTR(value_name.as_ptr()), 0, REG_SZ, Some(data))
                    .ok()
                    .map_err(|e| AppError::RegistryError(e.to_string()))
            }
        } else {
            let err = unsafe { RegDeleteValueW(hkey, PCWSTR(value_name.as_ptr())) };
            if err == ERROR_FILE_NOT_FOUND {
                Ok(())
            } else {
                err.ok().map_err(|e| AppError::RegistryError(e.to_string()))
            }
        };

        unsafe { let _ = RegCloseKey(hkey); }
        result
    }
}

// ── Public API ──────────────────────────────────────────────

pub fn get_autostart() -> bool {
    #[cfg(target_os = "windows")]
    {
        win::get_autostart()
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

pub fn set_autostart(enabled: bool) -> Result<(), AppError> {
    #[cfg(target_os = "windows")]
    {
        win::set_autostart(enabled)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = enabled;
        Ok(())
    }
}
