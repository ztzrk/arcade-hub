import { useState } from "react";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { soundManager } from "../shared/audio";

interface SoloTopBarProps {
  title: string;
  badge?: string;
  onExit: () => void;
}

export function SoloTopBar({ title, onExit }: SoloTopBarProps) {
  const [muted, setMuted] = useState(() => soundManager.isMuted());

  const toggleMute = () => {
    const next = !muted;
    soundManager.setMuted(next);
    setMuted(next);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#111210]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-2 px-3 sm:h-13 sm:px-4">
        <button
          type="button"
          onClick={onExit}
          className="flex min-h-[36px] items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#9c9689] hover:bg-white/6 hover:text-[#ebe5d8] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Arcade Hub</span>
        </button>

        <span className="font-display truncate text-sm font-semibold text-[#ebe5d8] sm:text-base">
          {title}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md p-1.5 text-[#9c9689] hover:bg-white/8 hover:text-[#ebe5d8] transition-colors cursor-pointer"
          title={muted ? "Aktifkan suara" : "Bisukan suara"}
          aria-label={muted ? "Aktifkan suara" : "Bisukan suara"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
