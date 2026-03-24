import { useEffect, useRef, useState } from "react";
import type { FavoriteFolder } from "../types";

interface Props {
  folder: FavoriteFolder;
  isMenuOpen: boolean;
  isInvalid: boolean;
  isEditing: boolean;
  onOpen: (path: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onContextMenu: (folderId: string, x: number, y: number) => void;
  onRenameCommit: (newName: string) => void;
}

export default function FolderItem({
  folder,
  isMenuOpen,
  isInvalid,
  isEditing,
  onOpen,
  onRemove,
  onContextMenu,
  onRenameCommit,
}: Props) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editValue, setEditValue] = useState(folder.name);

  useEffect(() => {
    if (isEditing) {
      setEditValue(folder.name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, folder.name]);

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      className={`group relative flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 ${
        isMenuOpen
          ? "bg-glass-active"
          : "hover:bg-glass-hover active:bg-glass-active"
      }`}
      onClick={() => {
        if (!isEditing) void onOpen(folder.path);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(folder.id, event.clientX, event.clientY);
      }}
      onKeyDown={(e) => {
        if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
          e.preventDefault();
          const rect = rowRef.current?.getBoundingClientRect();
          if (rect) {
            onContextMenu(folder.id, rect.left + rect.width / 2, rect.bottom);
          }
        }
      }}
    >
      {/* Drag handle — disabled (drag-to-reorder not yet implemented) */}
      <div
        className="shrink-0 cursor-default select-none opacity-30 text-white/60 text-sm leading-none"
        title="정렬 기능 준비 중"
        draggable={false}
      >
        ⠿
      </div>

      <div className="relative shrink-0">
        <svg
          className="h-4 w-4 text-accent transition-all duration-200 group-hover:drop-shadow-[0_0_4px_rgba(120,180,255,0.4)]"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
        </svg>
        {/* Amber warning badge */}
        {isInvalid && (
          <div
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(200, 130, 20, 0.85)" }}
            title="이 폴더가 존재하지 않습니다"
          >
            <span className="text-[6px] font-bold leading-none" style={{ color: "rgba(20,10,0,0.9)" }}>!</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onRenameCommit(editValue.trim() || folder.name);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onRenameCommit(folder.name);
              }
            }}
            onBlur={() => onRenameCommit(editValue.trim() || folder.name)}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-[13px] leading-tight text-white/85 outline-none border-b border-accent/50"
          />
        ) : (
          <div className="truncate text-[13px] leading-tight text-white/85 transition-colors group-hover:text-white/95">
            {folder.name}
          </div>
        )}
        <div className="mt-0.5 truncate text-[10px] leading-tight text-white/30">
          {folder.path}
        </div>
      </div>

      <button
        onClick={(event) => {
          event.stopPropagation();
          void onRemove(folder.id);
        }}
        className="flex h-5 w-5 items-center justify-center rounded-md text-white/25 opacity-0 transition-all duration-150 hover:bg-red-400/10 hover:text-red-400 group-hover:opacity-100"
        title="Remove"
      >
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path
            d="M1 1L7 7M7 1L1 7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
