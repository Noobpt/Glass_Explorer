import { getCurrentWindow } from "@tauri-apps/api/window";

interface Props {
  showSettings: boolean;
  onSettingsToggle: () => void;
}

export default function TitleBar({ showSettings, onSettingsToggle }: Props) {
  const appWindow = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between px-3 py-2.5"
      style={{ cursor: "move" }}
    >
      <div data-tauri-drag-region className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-accent glow-dot" />
        <span
          data-tauri-drag-region
          className="text-[11px] font-semibold tracking-[0.15em] text-white/60 uppercase whitespace-nowrap"
        >
          GlassExplorer
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={onSettingsToggle}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 ${
            showSettings
              ? "text-accent bg-accent/10"
              : "text-white/40 hover:text-white/80 hover:bg-white/8 active:bg-white/12"
          }`}
          title="Settings"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <circle cx="6" cy="6" r="1.8" />
            <path d="M6 1v1.2M6 9.8V11M1 6h1.2M9.8 6H11M2.4 2.4l.85.85M8.75 8.75l.85.85M9.6 2.4l-.85.85M3.25 8.75l-.85.85" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.minimize()}
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/8 active:bg-white/12 transition-all duration-150"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor" rx="0.5" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.close()}
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 active:bg-red-400/15 transition-all duration-150"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
