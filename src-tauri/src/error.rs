use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Path not found or not a directory: {0}")]
    PathNotFound(String),

    #[allow(dead_code)]
    #[error("Folder already exists in favorites: {0}")]
    DuplicateFolder(String),

    #[error("Failed to open folder in Explorer (code {code}): {path}")]
    ShellExecuteError { code: usize, path: String },

    #[error("Could not locate user config directory")]
    ConfigDirNotFound,

    #[error("Registry error: {0}")]
    RegistryError(String),

    #[error("Folder open failed: {0}")]
    FolderOpenError(String),

    #[error("COM error: {0}")]
    ComError(String),
}

#[cfg(target_os = "windows")]
impl From<windows::core::Error> for AppError {
    fn from(e: windows::core::Error) -> Self {
        AppError::ComError(e.to_string())
    }
}
