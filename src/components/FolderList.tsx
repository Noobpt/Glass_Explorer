import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FavoriteFolder } from "../types";
import type { OpenMode } from "../types";
import FolderItem from "./FolderItem";

interface Props {
  folders: FavoriteFolder[];
  openMode: OpenMode;
  onOpen: (path: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onReorder?: (ids: string[]) => void;  // optional: omit to disable drag-to-reorder (e.g. during search)
  isDraggingOver: boolean;
  invalidPaths: Set<string>;
}

interface ContextMenuState {
  folderId: string;
  x: number;
  y: number;
}

const MENU_WIDTH = 180;
const MENU_HEIGHT = 128;
const MENU_MARGIN = 8;

function clampMenuPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { left: x, top: y };
  }

  return {
    left: Math.max(
      MENU_MARGIN,
      Math.min(x, window.innerWidth - MENU_WIDTH - MENU_MARGIN),
    ),
    top: Math.max(
      MENU_MARGIN,
      Math.min(y, window.innerHeight - MENU_HEIGHT - MENU_MARGIN),
    ),
  };
}

export default function FolderList({
  folders,
  openMode,
  onOpen,
  onRemove,
  onRename,
  isDraggingOver,
  invalidPaths,
}: Props) {
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  const activeFolder = useMemo(
    () => folders.find((folder) => folder.id === menuState?.folderId) ?? null,
    [folders, menuState],
  );
  const isMenuVisible = menuState !== null && activeFolder !== null;

  const menuPosition = useMemo(() => {
    if (!menuState) {
      return null;
    }

    return clampMenuPosition(menuState.x, menuState.y);
  }, [menuState]);

  useEffect(() => {
    if (!isMenuVisible) {
      return;
    }

    const handlePointerEvent = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("mousedown", handlePointerEvent, true);
    window.addEventListener("contextmenu", handlePointerEvent, true);
    window.addEventListener("wheel", closeMenu, true);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerEvent, true);
      window.removeEventListener("contextmenu", handlePointerEvent, true);
      window.removeEventListener("wheel", closeMenu, true);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isMenuVisible]);

  return (
    <div
      className={`space-y-0.5 animate-stagger transition-all duration-200 ${isDraggingOver ? "drop-active rounded-lg" : ""}`}
    >
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isMenuOpen={menuState?.folderId === folder.id}
          isInvalid={invalidPaths.has(folder.path)}
          isEditing={editingId === folder.id}
          onOpen={onOpen}
          onRemove={onRemove}
          onContextMenu={(folderId, x, y) => {
            setMenuState({ folderId, x, y });
          }}
          onRenameCommit={(newName) => {
            setEditingId(null);
            if (newName !== folder.name) void onRename(folder.id, newName);
          }}
        />
      ))}

      {isDraggingOver && (
        <div className="flex items-center justify-center py-4 text-xs text-accent text-glow">
          Drop folders here to add
        </div>
      )}

      {activeFolder && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-lg glass-menu py-1 animate-fade-in"
          style={{ left: menuPosition.left, top: menuPosition.top }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/75 transition-colors hover:bg-white/8 hover:text-white/90"
            onClick={() => {
              closeMenu();
              void onOpen(activeFolder.path);
            }}
          >
            <svg
              className="h-3 w-3 text-accent/70"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M2 8h10m-3-3l3 3-3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {openMode === "newTab" ? "Open in new tab" : "Open in new window"}
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/75 transition-colors hover:bg-white/8 hover:text-white/90"
            onClick={() => {
              closeMenu();
              setEditingId(activeFolder.id);
            }}
          >
            <svg
              className="h-3 w-3 text-white/40"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Rename
          </button>
          <div className="mx-2 my-1 border-t border-white/6" />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-400/80 transition-colors hover:bg-red-400/8 hover:text-red-400"
            onClick={() => {
              closeMenu();
              void onRemove(activeFolder.id);
            }}
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
