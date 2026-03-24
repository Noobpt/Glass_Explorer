interface Props {
  isDraggingOver: boolean;
  onPickFolder: () => void;
}

export default function DropZone({ isDraggingOver, onPickFolder }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full gap-5 transition-all duration-300 ${
        isDraggingOver ? "drop-active rounded-xl scale-[1.02]" : ""
      }`}
    >
      {/* Glass ring with folder icon */}
      <div className={`relative transition-transform duration-300 ${isDraggingOver ? "scale-110" : ""}`}>
        {/* Outer glow ring */}
        <div className={`absolute inset-[-8px] rounded-full transition-opacity duration-500 ${
          isDraggingOver ? "opacity-100" : "opacity-0"
        }`} style={{
          background: "radial-gradient(circle, rgba(120,180,255,0.15) 0%, transparent 70%)",
        }} />

        {/* Icon container */}
        <div className="w-16 h-16 rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm flex items-center justify-center">
          <svg
            className={`w-8 h-8 transition-colors duration-300 ${
              isDraggingOver ? "text-accent" : "text-white/15"
            }`}
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M4 10a3 3 0 013-3h7l3 3h8a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V10z" />
            <path
              d="M16 17v-5m0 0l-2.5 2.5M16 12l2.5 2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-opacity duration-300 ${isDraggingOver ? "opacity-100" : "opacity-50"}`}
            />
          </svg>
        </div>
      </div>

      <div className="text-center space-y-1.5">
        <p className={`text-xs transition-colors duration-300 ${
          isDraggingOver ? "text-accent text-glow" : "text-white/35"
        }`}>
          {isDraggingOver ? "Drop to add folder" : "Drag & drop folders here"}
        </p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-px bg-white/8" />
          <span className="text-[10px] text-white/20">or</span>
          <div className="w-8 h-px bg-white/8" />
        </div>
      </div>

      <button
        onClick={onPickFolder}
        className="px-5 py-1.5 text-xs rounded-lg border border-glass-border bg-glass-bg hover:bg-glass-hover text-white/50 hover:text-white/75 transition-all duration-200 hover:border-white/20 active:scale-[0.97]"
      >
        Browse Folder
      </button>
    </div>
  );
}
