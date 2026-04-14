import type { GhostMode, OpenMode } from "../types";

interface GlassSettings {
  blur: number;
  opacity: number;
  refraction: number;
}

interface Props {
  alwaysOnTop: boolean;
  ghostMode: GhostMode;
  showSettings: boolean;
  glass: GlassSettings;
  openMode: OpenMode;
  onAlwaysOnTopToggle: (enabled: boolean) => void;
  onGhostToggle: () => void;
  onGlassChange: (settings: GlassSettings) => void;
  onOpenModeChange: (mode: OpenMode) => void;
  onAddFolder: () => void;
  folderCount: number;
  isLoading?: boolean;
}

function MiniSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[9px] text-white/30">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className="flex-1"
      />
      <span className="w-6 text-right text-[9px] tabular-nums text-white/25">
        {value.toFixed(step < 1 ? 1 : 0)}
      </span>
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-150 ${
        active
          ? "border border-accent/30 bg-accent/15 text-accent"
          : "border border-transparent bg-transparent text-white/35 hover:bg-white/[0.04] hover:text-white/60"
      }`}
    >
      {label}
    </button>
  );
}

export default function ControlPanel({
  alwaysOnTop,
  ghostMode,
  showSettings,
  glass,
  openMode,
  onAlwaysOnTopToggle,
  onGhostToggle,
  onGlassChange,
  onOpenModeChange,
  onAddFolder,
  folderCount,
  isLoading = false,
}: Props) {
  return (
    <div className="space-y-2 border-t border-white/[0.06] px-3 py-2.5">
      {showSettings && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[9px] text-white/30">Blur</span>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={glass.blur === 0 ? 1 : glass.blur}
              onChange={(event) =>
                onGlassChange({ ...glass, blur: parseFloat(event.target.value) })
              }
              disabled={glass.blur === 0}
              className="flex-1 disabled:opacity-30"
            />
            <span className="w-6 text-right text-[9px] tabular-nums text-white/25">
              {glass.blur === 0 ? "0" : glass.blur.toFixed(0)}
            </span>
            <button
              onClick={() =>
                onGlassChange({ ...glass, blur: glass.blur === 0 ? 1 : 0 })
              }
              title={glass.blur === 0 ? "Turn blur on" : "Turn blur off"}
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] transition-all duration-150 ${
                glass.blur === 0
                  ? "border-accent/30 bg-accent/15 text-accent"
                  : "border-white/[0.06] bg-white/[0.03] text-white/30 hover:text-white/50"
              }`}
            >
              off
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[9px] text-white/30">Opacity</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={glass.opacity === 0 ? 0.2 : glass.opacity}
              onChange={(event) =>
                onGlassChange({
                  ...glass,
                  opacity: parseFloat(event.target.value),
                })
              }
              disabled={glass.opacity === 0}
              className="flex-1 disabled:opacity-30"
            />
            <span className="w-6 text-right text-[9px] tabular-nums text-white/25">
              {glass.opacity === 0 ? "0" : glass.opacity.toFixed(1)}
            </span>
            <button
              onClick={() =>
                onGlassChange({
                  ...glass,
                  opacity: glass.opacity === 0 ? 0.6 : 0,
                })
              }
              title={glass.opacity === 0 ? "Turn opacity on" : "Turn opacity off"}
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] transition-all duration-150 ${
                glass.opacity === 0
                  ? "border-accent/30 bg-accent/15 text-accent"
                  : "border-white/[0.06] bg-white/[0.03] text-white/30 hover:text-white/50"
              }`}
            >
              off
            </button>
          </div>

          <MiniSlider
            label="Refraction"
            value={glass.refraction}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => onGlassChange({ ...glass, refraction: value })}
          />
        </>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAlwaysOnTopToggle(!alwaysOnTop)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
              alwaysOnTop
                ? "border border-accent/25 bg-accent/15 text-accent shadow-[0_0_8px_rgba(120,180,255,0.12)]"
                : "border border-white/[0.06] bg-white/[0.03] text-white/35 hover:bg-white/[0.05] hover:text-white/50"
            }`}
            title="Always on top"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <path
                d="M8 2v8M5 7l3 3 3-3"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="rotate(180, 8, 8)"
              />
              <path d="M4 2h8" strokeLinecap="round" />
            </svg>
            Pin
          </button>

          <button
            onClick={onGhostToggle}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
              ghostMode === "invert"
                ? "border border-accent/45 bg-accent/25 text-accent shadow-[0_0_10px_rgba(120,180,255,0.18)]"
                : ghostMode === "normal"
                  ? "border border-accent/25 bg-accent/15 text-accent shadow-[0_0_8px_rgba(120,180,255,0.12)]"
                  : "border border-white/[0.06] bg-white/[0.03] text-white/35 hover:bg-white/[0.05] hover:text-white/50"
            }`}
            title={`Ghost mode: ${ghostMode}`}
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="5" />
              {ghostMode === "normal" && (
                <path d="M8 3 A5 5 0 0 1 8 13 Z" fill="currentColor" stroke="none" />
              )}
              {ghostMode === "invert" && (
                <circle cx="8" cy="8" r="5" fill="currentColor" stroke="none" />
              )}
            </svg>
            Ghost
          </button>

          <button
            onClick={onAddFolder}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/35 transition-all duration-200 active:scale-[0.97] hover:bg-white/[0.05] hover:text-white/50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Add folder"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add
          </button>
        </div>

        <span className="text-[10px] tabular-nums text-white/15">
          {folderCount} folder{folderCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-white/22">
          Open Mode
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
          <ModeButton
            label="New Tab"
            active={openMode === "newTab"}
            onClick={() => onOpenModeChange("newTab")}
          />
          <ModeButton
            label="New Window"
            active={openMode === "newWindow"}
            onClick={() => onOpenModeChange("newWindow")}
          />
        </div>
      </div>
    </div>
  );
}

export type { GlassSettings } from "../types";
