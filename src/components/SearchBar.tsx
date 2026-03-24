import { useState, useRef, useEffect } from "react";

interface Props {
  onQueryChange: (query: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function SearchBar({ onQueryChange, inputRef }: Props) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: string) => {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onQueryChange(v), 150);
  };

  const handleClear = () => {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onQueryChange("");
    inputRef?.current?.focus();
  };

  // Clear on unmount so stale query doesn't linger
  useEffect(() => () => onQueryChange(""), [onQueryChange]);

  return (
    <div className="px-3 pt-1 pb-2">
      <div className="flex items-center gap-2 border-b border-white/[0.08] focus-within:border-accent/50 transition-colors duration-150 pb-1">
        {/* Magnifier icon */}
        <svg
          className="w-3 h-3 text-white/25 shrink-0 transition-colors duration-150"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="6.5" cy="6.5" r="4" />
          <path d="M11 11l3 3" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search folders…"
          className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/20 outline-none"
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="w-3.5 h-3.5 flex items-center justify-center text-white/25 hover:text-white/55 transition-colors duration-150 shrink-0"
            title="Clear search"
          >
            <svg viewBox="0 0 8 8" width="7" height="7">
              <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
