import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openFolder } from "./lib/tauri";
import { getCurrentWindow } from "@tauri-apps/api/window";
import TitleBar from "./components/TitleBar";
import FolderList from "./components/FolderList";
import ControlPanel from "./components/ControlPanel";
import DropZone from "./components/DropZone";
import SearchBar from "./components/SearchBar";
import type { GlassSettings } from "./components/ControlPanel";
import type { FavoriteFolder, GhostMode, OpenMode } from "./types";

const OPEN_MODE_STORAGE_KEY = "glass-explorer.open-mode";

function loadStoredOpenMode(): OpenMode {
  if (typeof window === "undefined") {
    return "newTab";
  }

  const storedValue = window.localStorage.getItem(OPEN_MODE_STORAGE_KEY);
  return storedValue === "newWindow" ? "newWindow" : "newTab";
}

export default function App() {
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [ghostMode, setGhostMode] = useState<GhostMode>("off");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [openMode, setOpenMode] = useState<OpenMode>(loadStoredOpenMode);
  const [glass, setGlass] = useState<GlassSettings>({
    blur: 1,
    opacity: 0.6,
    refraction: 0,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [invalidPaths, setInvalidPaths] = useState<Set<string>>(new Set());
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const validationCooldownRef = useRef<number>(0);

  const showError = useCallback((message: string) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }

    setError(message);
    errorTimerRef.current = setTimeout(() => setError(null), 3000);
  }, []);

  const showInfo = useCallback((message: string) => {
    if (infoTimerRef.current) {
      clearTimeout(infoTimerRef.current);
    }

    setInfo(message);
    infoTimerRef.current = setTimeout(() => setInfo(null), 3000);
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const result = await invoke<FavoriteFolder[]>("get_favorites");
      setFolders(result);
    } catch {
      // Ignore empty state on first launch.
    }
  }, []);

  const addFavorite = useCallback(async (path: string) => {
    const result = await invoke<FavoriteFolder[]>("add_favorite", { path });
    setFolders(result);
    return result;
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(OPEN_MODE_STORAGE_KEY, openMode);
  }, [openMode]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      if (infoTimerRef.current) {
        clearTimeout(infoTimerRef.current);
      }
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
      if (opacityTimerRef.current) {
        clearTimeout(opacityTimerRef.current);
      }
    };
  }, []);

  const handleRenameFolder = useCallback(async (id: string, newName: string) => {
    try {
      const result = await invoke<FavoriteFolder[]>("rename_favorite", { id, newName });
      setFolders(result);
    } catch (errorValue) {
      showError(`Failed to rename folder: ${errorValue}`);
    }
  }, [showError]);

  const handleReorder = useCallback(async (ids: string[]) => {
    try {
      const result = await invoke<FavoriteFolder[]>("reorder_favorites", { ids });
      setFolders(result);
    } catch (errorValue) {
      showError(`Failed to reorder folders: ${errorValue}`);
    }
  }, [showError]);

  const validateAll = useCallback(async (currentFolders: FavoriteFolder[]) => {
    if (currentFolders.length === 0) {
      setInvalidPaths(new Set());
      return;
    }
    try {
      const paths = currentFolders.map((f) => f.path);
      const results = await invoke<boolean[]>("validate_paths", { paths });
      setInvalidPaths(new Set(paths.filter((_, i) => !results[i])));
    } catch {
      // Non-fatal: silently ignore validation errors
    }
  }, []);

  const handleRemoveFolder = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const result = await invoke<FavoriteFolder[]>("remove_favorite", { id });
      setFolders(result);
    } catch (errorValue) {
      showError(`Failed to remove folder: ${errorValue}`);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const handleOpenFolder = useCallback(async (path: string) => {
    try {
      const usedFallback = await openFolder(path, openMode);
      if (usedFallback) {
        showInfo("New Tab을 사용할 수 없어 새 창으로 열었습니다");
      }
    } catch (errorValue) {
      showError(`Failed to open folder: ${errorValue}`);
    }
  }, [openMode, showError, showInfo]);

  const handlePickFolder = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const path = await invoke<string | null>("pick_folder");
      if (path) {
        await addFavorite(path);
      }
    } catch (errorValue) {
      showError(`Failed to pick folder: ${errorValue}`);
    } finally {
      setIsLoading(false);
    }
  }, [addFavorite, isLoading, showError]);

  const handleGlassChange = useCallback((settings: GlassSettings) => {
    setGlass(settings);

    if (settings.blur !== glass.blur) {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
      blurTimerRef.current = setTimeout(() => {
        void invoke("set_blur", { blur: settings.blur });
      }, 80);
    }

    if (settings.opacity !== glass.opacity) {
      if (opacityTimerRef.current) {
        clearTimeout(opacityTimerRef.current);
      }
      opacityTimerRef.current = setTimeout(() => {
        void invoke("set_opacity", { opacity: settings.opacity });
      }, 80);
    }
  }, [glass]);

  const handleGhostToggle = useCallback(() => {
    setGhostMode((current) => {
      const next: GhostMode =
        current === "off" ? "normal" : current === "normal" ? "invert" : "off";
      void invoke("set_ghost", { enabled: next !== "off" });
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.setAttribute("data-ghost", ghostMode);
  }, [ghostMode]);

  const handleAlwaysOnTopToggle = useCallback((enabled: boolean) => {
    setAlwaysOnTop(enabled);
    void invoke("set_always_on_top", { enabled });
  }, []);

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === "over") {
        setIsDraggingOver(true);
        return;
      }

      if (event.payload.type === "leave") {
        setIsDraggingOver(false);
        return;
      }

      if (event.payload.type === "drop") {
        setIsDraggingOver(false);
        setIsLoading(true);

        try {
          let lastResult: FavoriteFolder[] | null = null;
          for (const path of event.payload.paths) {
            try {
              lastResult = await addFavorite(path);
            } catch (errorValue) {
              showError(`Failed to add folder: ${errorValue}`);
            }
          }

          if (lastResult !== null) {
            setFolders(lastResult);
          }
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [addFavorite, showError]);

  useEffect(() => {
    void validateAll(folders);
  }, [folders, validateAll]);

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - validationCooldownRef.current < 30_000) return;
      validationCooldownRef.current = now;
      void validateAll(folders);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [folders, validateAll]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const glassStyle = useMemo<React.CSSProperties>(() => {
    if (ghostMode !== "off") {
      return {
        backgroundColor: "transparent",
        backgroundImage: "none",
        boxShadow: "none",
      };
    }

    return {
      backgroundColor: "rgba(10, 15, 25, 0.25)",
      backgroundImage: `linear-gradient(rgba(255,255,255,${glass.refraction}), rgba(255,255,255,${glass.refraction}))`,
      boxShadow: [
        "0 8px 32px rgba(0, 0, 0, 0.1)",
        "inset 0 1px 0 rgba(255, 255, 255, 0.3)",
        "inset 0 -1px 0 rgba(255, 255, 255, 0.05)",
        "inset 0 0 20px 10px rgba(255, 255, 255, 0.01)",
      ].join(", "),
    };
  }, [glass, ghostMode]);

  const isSearching = searchQuery.trim().length > 0;

  const filteredFolders = useMemo(() => {
    if (!isSearching) return folders;
    const q = searchQuery.trim().toLowerCase();
    return folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q),
    );
  }, [folders, searchQuery, isSearching]);

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-xl transition-all duration-300 animate-fade-in ${ghostMode !== "off" ? "border border-transparent" : "border border-white/30"}`}
      style={glassStyle}
    >
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-px"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.8), transparent, rgba(255,255,255,0.3))",
        }}
      />

      {error && (
        <div className="absolute left-2 right-2 top-8 z-50 rounded-md border border-red-500/25 bg-red-900/50 px-3 py-1.5 text-xs text-red-300 animate-fade-in">
          {error}
        </div>
      )}

      {info && (
        <div className="absolute left-2 right-2 top-8 z-50 rounded-md border border-blue-500/25 bg-blue-900/50 px-3 py-1.5 text-xs text-blue-300 animate-fade-in">
          {info}
        </div>
      )}

      <TitleBar
        showSettings={showSettings}
        onSettingsToggle={() => setShowSettings((currentValue) => !currentValue)}
      />

      {/* Search — only when there are folders */}
      {folders.length > 0 && (
        <SearchBar onQueryChange={setSearchQuery} inputRef={searchRef} />
      )}

      <div className="flex-1 overflow-y-auto px-3 py-1">
        {folders.length === 0 ? (
          <DropZone
            isDraggingOver={isDraggingOver}
            onPickFolder={handlePickFolder}
          />
        ) : filteredFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-6 animate-fade-in">
            <svg className="w-7 h-7 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="10" cy="10" r="6" />
              <path d="M16 16l4 4" />
              <path d="M8 10h4M10 8v4" opacity="0.4" />
            </svg>
            <p className="text-[11px] text-white/25">No matching folders</p>
            <p className="text-[10px] text-white/15">"{searchQuery}"</p>
          </div>
        ) : (
          <FolderList
            folders={filteredFolders}
            openMode={openMode}
            onOpen={handleOpenFolder}
            onRemove={handleRemoveFolder}
            onRename={handleRenameFolder}
            onReorder={isSearching ? undefined : handleReorder}
            isDraggingOver={isDraggingOver}
            invalidPaths={invalidPaths}
          />
        )}
      </div>

      <ControlPanel
        alwaysOnTop={alwaysOnTop}
        ghostMode={ghostMode}
        showSettings={showSettings}
        glass={glass}
        openMode={openMode}
        onAlwaysOnTopToggle={handleAlwaysOnTopToggle}
        onGhostToggle={handleGhostToggle}
        onGlassChange={handleGlassChange}
        onOpenModeChange={setOpenMode}
        onAddFolder={handlePickFolder}
        folderCount={folders.length}
        isLoading={isLoading}
      />
    </div>
  );
}
