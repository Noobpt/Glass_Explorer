use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FavoriteFolder {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct FavoritesStore {
    pub favorites: Vec<FavoriteFolder>,
}

impl FavoritesStore {
    fn storage_path() -> Result<PathBuf, AppError> {
        let dir = dirs::config_dir()
            .ok_or(AppError::ConfigDirNotFound)?
            .join("glass-explorer");
        fs::create_dir_all(&dir)?;
        Ok(dir.join("favorites.json"))
    }

    pub fn load() -> Result<Self, AppError> {
        let path = Self::storage_path()?;
        if path.exists() {
            let data = fs::read_to_string(&path)?;
            match serde_json::from_str::<Self>(&data) {
                Ok(store) => Ok(store),
                Err(_) => {
                    let backup = path.with_extension("json.bak");
                    let _ = fs::rename(&path, &backup);
                    Ok(Self::default())
                }
            }
        } else {
            Ok(Self::default())
        }
    }

    fn save(&self) -> Result<(), AppError> {
        let path = Self::storage_path()?;
        let json = serde_json::to_string_pretty(self)?;
        let tmp_path = path.with_extension("json.tmp");
        fs::write(&tmp_path, &json)?;
        fs::rename(&tmp_path, &path)?;
        Ok(())
    }

    pub fn add(&mut self, folder_path: &str) -> Result<(), AppError> {
        let path = PathBuf::from(folder_path);
        if !path.is_dir() {
            return Err(AppError::PathNotFound(folder_path.to_string()));
        }
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| folder_path.to_string());

        if self.favorites.iter().any(|f| f.path == folder_path) {
            return Ok(());
        }

        let id = format!("{:x}", fnv1a(folder_path));
        self.favorites.push(FavoriteFolder {
            id,
            name,
            path: folder_path.to_string(),
        });
        self.save()
    }

    pub fn remove(&mut self, id: &str) -> Result<(), AppError> {
        self.favorites.retain(|f| f.id != id);
        self.save()
    }

    pub fn rename(&mut self, id: &str, new_name: &str) -> Result<(), AppError> {
        match self.favorites.iter_mut().find(|f| f.id == id) {
            Some(folder) => {
                folder.name = new_name.to_string();
                self.save()
            }
            None => Err(AppError::PathNotFound(format!("Favorite not found: {}", id))),
        }
    }

    pub fn reorder(&mut self, ids: &[String]) -> Result<(), AppError> {
        let mut reordered = Vec::with_capacity(ids.len());
        for id in ids {
            if let Some(f) = self.favorites.iter().find(|f| &f.id == id) {
                reordered.push(f.clone());
            }
        }
        self.favorites = reordered;
        self.save()
    }
}

/// FNV-1a hash for stable, duplicate-free ID generation
fn fnv1a(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}
