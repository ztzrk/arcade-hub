import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LiarsDeckOutcome, LiarsDeckReveal, PublicPlayer } from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import { PlayingCard } from "./PlayingCard";

interface RevolverModalProps {
  pendingReveal: LiarsDeckReveal | null;
  rouletteTargetId: string | null;
  myPlayerId: string | null;
  players: PublicPlayer[];
  myShotsFired: number;
  opponentShotsFired: number;
  maxChambers: number;
  activeOutcome: LiarsDeckOutcome | null;
  onPullTrigger: () => void;
  onDismissOutcome: () => void;
}

function CylinderSvg({
  shotsFired,
  maxChambers,
  spinning,
  hit,
}: {
  shotsFired: number;
  maxChambers: number;
  spinning: boolean;
  hit?: boolean;
}) {
  const angleStep = 360 / maxChambers;
  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="h-24 w-24"
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { duration: 0.65, ease: "easeOut" } : { duration: 0.25 }}
    >
      <circle cx="60" cy="60" r="54" fill="#181916" stroke="#d4a24c" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="9" fill="#d4a24c" />
      {Array.from({ length: maxChambers }).map((_, i) => {
        const rad = ((i * angleStep - 90) * Math.PI) / 180;
        const cx = 60 + Math.cos(rad) * 32;
        const cy = 60 + Math.sin(rad) * 32;
        const spent = i < shotsFired;
        const fatal = hit && i === shotsFired - 1;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="10.5"
            fill={fatal ? "#d9483b" : spent ? "#2c2e29" : "#0e0f0d"}
            stroke={fatal ? "#fca5a5" : spent ? "#595c52" : "#d4a24c"}
            strokeOpacity={spent && !fatal ? 0.4 : 0.8}
            strokeWidth="1.5"
          />
        );
      })}
    </motion.svg>
  );
}

export function RevolverModal({
  pendingReveal,
  rouletteTargetId,
  myPlayerId,
  players,
  myShotsFired,
  opponentShotsFired,
  maxChambers,
  activeOutcome,
  onPullTrigger,
  onDismissOutcome,
}: RevolverModalProps) {
  const isWaitingPull = Boolean(pendingReveal && rouletteTargetId);
  const showModal = isWaitingPull || Boolean(activeOutcome);

  useEffect(() => {
    if (isWaitingPull) {
      soundManager.play("heartbeat");
    }
  }, [isWaitingPull]);

  if (!showModal) return null;

  const reveal = pendingReveal ?? activeOutcome?.reveal ?? null;
  const targetId = rouletteTargetId ?? activeOutcome?.targetId ?? null;
  const targetPlayer = players.find((p) => p.id === targetId);
  const accusedPlayer = players.find((p) => p.id === reveal?.accusedPlayerId);
  const isMyPull = targetId === myPlayerId;
  const targetShots = targetId === myPlayerId ? myShotsFired : opponentShotsFired;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-sm rounded-xl border border-white/12 bg-[#161714] p-6 text-center shadow-2xl"
        >
          {reveal && (
            <div className="mb-5">
              <h3 className="font-display text-2xl text-[#ebe5d8]">
                {reveal.wasLie
                  ? `${accusedPlayer?.name ?? "Pemain"} bohong`
                  : `${accusedPlayer?.name ?? "Pemain"} jujur`}
              </h3>
              <p className="mt-0.5 text-xs text-[#9c9689]">
                Target: {reveal.claimedRank}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {reveal.playedCards.map((card, i) => {
                  const isMatch = card === reveal.claimedRank || card === "JOKER";
                  return (
                    <PlayingCard
                      key={`${card}-${i}`}
                      rank={card}
                      size="sm"
                      statusRing={isMatch ? "match" : "lie"}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4 border-t border-white/10 pt-5">
            <CylinderSvg
              shotsFired={targetShots}
              maxChambers={maxChambers}
              spinning={Boolean(activeOutcome)}
              hit={activeOutcome?.hit}
            />

            {activeOutcome && !isWaitingPull ? (
              <>
                <p
                  className={`font-mono-tabular text-base font-bold ${
                    activeOutcome.hit ? "text-[#e87066]" : "text-emerald-400"
                  }`}
                >
                  {activeOutcome.hit
                    ? `BANG! (${targetPlayer?.name ?? "Pemain"} kena)`
                    : `CLICK. (${targetShots}/${maxChambers})`}
                </p>
                <button
                  onClick={onDismissOutcome}
                  className="w-full rounded-lg border border-white/15 bg-[#22241f] py-2.5 text-sm font-medium text-[#ebe5d8] hover:bg-[#2c2f28] transition-colors cursor-pointer"
                >
                  Lanjut
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-[#cfc8ba]">
                  {isMyPull
                    ? "Giliranmu tarik pelatuk."
                    : `Menunggu ${targetPlayer?.name ?? "lawan"} menarik pelatuk...`}
                </p>

                {isMyPull && (
                  <button
                    onClick={onPullTrigger}
                    className="w-full rounded-lg bg-[#d9483b] py-3 text-sm font-semibold text-white hover:bg-[#e15a4e] transition-colors cursor-pointer"
                  >
                    Tarik Pelatuk ({targetShots + 1}/{maxChambers})
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
