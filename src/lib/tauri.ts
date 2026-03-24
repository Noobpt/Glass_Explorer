import { invoke } from "@tauri-apps/api/core";
import type { FavoriteFolder } from "../types";

export async function getFavorites(): Promise<FavoriteFolder[]> {
  return invoke("get_favorites");
}

export async function addFavorite(path: string): Promise<FavoriteFolder[]> {
  return invoke("add_favorite", { path });
}

export async function removeFavorite(id: string): Promise<FavoriteFolder[]> {
  return invoke("remove_favorite", { id });
}

export async function reorderFavorites(ids: string[]): Promise<FavoriteFolder[]> {
  return invoke("reorder_favorites", { ids });
}

export async function renameFavorite(id: string, newName: string): Promise<FavoriteFolder[]> {
  return invoke("rename_favorite", { id, newName });
}

export async function validatePaths(paths: string[]): Promise<boolean[]> {
  return invoke("validate_paths", { paths });
}

export async function openFolder(path: string, mode: "newTab" | "newWindow" = "newTab"): Promise<boolean> {
  return invoke<boolean>("open_folder", { path, mode });
}

export async function pickFolder(): Promise<string | null> {
  return invoke("pick_folder");
}

export async function setOpacity(opacity: number): Promise<void> {
  return invoke("set_opacity", { opacity });
}

export async function setBlur(blur: number): Promise<void> {
  return invoke("set_blur", { blur });
}

export async function setGhost(enabled: boolean): Promise<void> {
  return invoke("set_ghost", { enabled });
}

export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  return invoke("set_always_on_top", { enabled });
}

export async function getAutostart(): Promise<boolean> {
  return invoke("get_autostart");
}

export async function setAutostart(enabled: boolean): Promise<void> {
  return invoke("set_autostart", { enabled });
}
