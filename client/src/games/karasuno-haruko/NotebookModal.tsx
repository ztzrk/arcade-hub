import { useMemo, useState } from "react";
import { Award, BookOpen, Lock, Sparkles, Users, X } from "lucide-react";
import {
  HAIKYUU_PLAYERS,
  HAIKYUU_SYNERGY_CATALOG,
} from "@arcade-hub/shared";
import { HAIKYUU_BADGES, type KarasunoCollection } from "./collection";
import { JerseyAvatar } from "./JerseyAvatar";

interface NotebookModalProps {
  collection: KarasunoCollection;
  onClose: () => void;
}

type NotebookTab = "synergies" | "players" | "badges";

export function NotebookModal({ collection, onClose }: NotebookModalProps) {
  const [tab, setTab] = useState<NotebookTab>("synergies");

  const unlockedPlayers = useMemo(
    () => new Set(collection.unlockedPlayerIds),
    [collection.unlockedPlayerIds]
  );
  const unlockedSynergies = useMemo(
    () => new Set(collection.unlockedSynergyIds),
    [collection.unlockedSynergyIds]
  );
  const unlockedBadges = useMemo(
    () => new Set(collection.unlockedBadgeIds),
    [collection.unlockedBadgeIds]
  );

  const sortedPlayers = useMemo(
    () => [...HAIKYUU_PLAYERS].sort((a, b) => b.ovr - a.ovr),
    []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs sm:p-5">
      <div className="flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/15 bg-[#141513] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/12 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[#f97316]" />
            <div>
              <h2 className="font-display text-lg text-[#ebe5d8] sm:text-xl">
                Notebook Karasuno
              </h2>
              <p className="text-[11px] text-[#9c9689]">
                Koleksi pemain, resonansi tim, &amp; lencana prestasi Haruko
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/12 text-[#9c9689] hover:bg-white/8 hover:text-[#ebe5d8] cursor-pointer"
            aria-label="Tutup notebook"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="grid grid-cols-3 border-b border-white/10 bg-[#10110f] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("synergies")}
            className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors cursor-pointer ${
              tab === "synergies"
                ? "border-[#f97316] text-[#fb923c]"
                : "border-transparent text-[#9c9689] hover:text-[#ebe5d8]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              Resonansi ({unlockedSynergies.size}/{HAIKYUU_SYNERGY_CATALOG.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("players")}
            className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors cursor-pointer ${
              tab === "players"
                ? "border-[#f97316] text-[#fb923c]"
                : "border-transparent text-[#9c9689] hover:text-[#ebe5d8]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>
              Pemain ({unlockedPlayers.size}/{HAIKYUU_PLAYERS.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("badges")}
            className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors cursor-pointer ${
              tab === "badges"
                ? "border-[#f97316] text-[#fb923c]"
                : "border-transparent text-[#9c9689] hover:text-[#ebe5d8]"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>
              Lencana ({unlockedBadges.size}/{HAIKYUU_BADGES.length})
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === "synergies" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {HAIKYUU_SYNERGY_CATALOG.map((syn) => {
                const unlocked = unlockedSynergies.has(syn.id);
                return (
                  <div
                    key={syn.id}
                    className={`rounded-md border p-3 ${
                      unlocked
                        ? "border-[#f97316]/45 bg-[#1e1711]"
                        : "border-white/8 bg-[#111210] opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ebe5d8]">
                        {unlocked ? (
                          <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-[#6b665d]" />
                        )}
                        {syn.name}
                      </span>
                      <span className="font-mono-tabular text-[10px] text-[#d4a24c]">
                        {syn.category}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#9c9689]">{syn.hint}</p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "players" && (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {sortedPlayers.map((p) => {
                const unlocked = unlockedPlayers.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2.5 rounded-md border p-2 ${
                      unlocked
                        ? "border-white/15 bg-[#181917]"
                        : "border-white/6 bg-[#111210] opacity-45 grayscale"
                    }`}
                  >
                    <JerseyAvatar
                      number={p.number}
                      primaryColor={p.primaryColor}
                      secondaryColor={p.secondaryColor}
                      position={p.position}
                      tier={p.tier}
                      blind={!unlocked}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#ebe5d8]">
                        {unlocked ? p.name : "???"}
                      </p>
                      <p className="truncate text-[10px] text-[#9c9689]">
                        {p.schoolLabel} • {p.position} {unlocked ? `• OVR ${p.ovr}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "badges" && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {HAIKYUU_BADGES.map((badge) => {
                const unlocked = unlockedBadges.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex items-start gap-3 rounded-md border p-3 ${
                      unlocked
                        ? "border-[#d4a24c]/55 bg-[#1b1811]"
                        : "border-white/8 bg-[#111210] opacity-65"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                        unlocked
                          ? "border-[#d4a24c] bg-[#d4a24c]/15 text-[#d4a24c]"
                          : "border-white/10 bg-white/5 text-[#6b665d]"
                      }`}
                    >
                      {unlocked ? (
                        <Award className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#ebe5d8]">
                        {badge.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#9c9689]">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
