import { AnimatePresence, m } from "framer-motion";
import { TAUNT_EMOTES } from "@arcade-hub/shared";
import type { FloatingTaunt } from "./useGameSocket";

interface TauntOverlayProps {
  taunts: FloatingTaunt[];
  myPlayerId: string | null;
}

export function TauntOverlay({ taunts, myPlayerId }: TauntOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex flex-col items-center gap-1.5 px-3 sm:top-16 sm:px-4">
      <AnimatePresence>
        {taunts.map((taunt) => {
          const meta = TAUNT_EMOTES.find((t) => t.id === taunt.emoteId);
          const isMine = taunt.fromPlayerId === myPlayerId;
          return (
            <m.div
              key={taunt.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={`flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm sm:gap-2 ${
                isMine
                  ? "border-white/15 bg-[#1b1c19]/95 text-[#ebe5d8]"
                  : "border-[#d4a24c]/40 bg-[#1e1a14]/95 text-[#f3dfb8]"
              }`}
            >
              <span className="shrink-0">{meta?.emoji ?? "💬"}</span>
              <span className="max-w-[100px] truncate font-semibold">{taunt.fromName}:</span>
              <span className="truncate">{meta?.label ?? taunt.emoteId}</span>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
