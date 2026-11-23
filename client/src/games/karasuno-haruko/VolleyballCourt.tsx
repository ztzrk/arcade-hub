import { m } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import {
  COURT_SLOTS,
  getPositionFit,
  type CourtSlotId,
  type CourtSlotMeta,
  type HaikyuuPlayer,
  type LineupMap,
  type TeamEvaluation,
} from "@arcade-hub/shared";
import { JerseyAvatar } from "./JerseyAvatar";

interface VolleyballCourtProps {
  lineup: LineupMap;
  evaluation: TeamEvaluation;
  selectedPlayer: HaikyuuPlayer | null;
  blindMode?: boolean;
  interactive?: boolean;
  onPlaceInSlot?: (slotId: CourtSlotId) => void;
}

const FRONT_ROW: CourtSlotId[] = ["OH1", "MB1", "OP"];
const BACK_ROW: CourtSlotId[] = ["OH2", "MB2", "S"];

const SLOT_COORDS: Record<CourtSlotId, { x: number; y: number }> = {
  OH1: { x: 18, y: 18 },
  MB1: { x: 50, y: 18 },
  OP: { x: 82, y: 18 },
  OH2: { x: 18, y: 51 },
  MB2: { x: 50, y: 51 },
  S: { x: 82, y: 51 },
  L: { x: 82, y: 84 },
};

function getSlotMeta(id: CourtSlotId): CourtSlotMeta {
  return COURT_SLOTS.find((s) => s.id === id)!;
}

export function VolleyballCourt({
  lineup,
  evaluation,
  selectedPlayer,
  blindMode = false,
  interactive = true,
  onPlaceInSlot,
}: VolleyballCourtProps) {
  const synergyPlayerIds = new Set(
    evaluation.activeSynergies.flatMap((s) => s.involvedPlayerIds)
  );

  const playerSlotById = new Map<string, CourtSlotId>();
  for (const slot of COURT_SLOTS) {
    const p = lineup[slot.id];
    if (p) playerSlotById.set(p.id, slot.id);
  }

  const synergyEdges: { key: string; from: CourtSlotId; to: CourtSlotId }[] = [];
  const seenPairs = new Set<string>();
  for (const syn of evaluation.activeSynergies) {
    const slots = syn.involvedPlayerIds
      .map((pid) => playerSlotById.get(pid))
      .filter((s): s is CourtSlotId => Boolean(s));
    for (let i = 0; i < slots.length - 1; i++) {
      const a = slots[i]!;
      const b = slots[i + 1]!;
      const pairKey = [a, b].sort().join("-");
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        synergyEdges.push({ key: pairKey, from: a, to: b });
      }
    }
  }

  const renderSlot = (slotId: CourtSlotId) => {
    const meta = getSlotMeta(slotId);
    const player = lineup[slotId];
    const slotScore = evaluation.slotScores[slotId];
    const canPlace = interactive && Boolean(selectedPlayer) && !player;
    const previewFit =
      canPlace && selectedPlayer ? getPositionFit(selectedPlayer, slotId) : null;
    const hasSynergy = player ? synergyPlayerIds.has(player.id) : false;

    const fitTextColor =
      previewFit?.fit === "PERFECT"
        ? "text-emerald-300"
        : previewFit?.fit === "FLEX"
          ? "text-amber-300"
          : "text-rose-300";

    return (
      <button
        key={slotId}
        type="button"
        disabled={!canPlace}
        onClick={() => canPlace && onPlaceInSlot?.(slotId)}
        className={`relative flex w-full min-h-[104px] flex-col items-center justify-between rounded-md border p-2 text-center transition-all sm:min-h-[114px] ${
          player
            ? hasSynergy
              ? "border-[#f97316] bg-[#161513]/95 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.35)]"
              : "border-white/20 bg-[#141513]/92"
            : canPlace
              ? "cursor-pointer border-white/80 bg-[#f97316]/20 hover:bg-[#f97316]/32"
              : "border-dashed border-white/25 bg-black/25"
        }`}
      >
        <div className="flex w-full items-center justify-between gap-1 text-[10px]">
          <span className="font-mono-tabular font-bold text-[#fb923c]">
            {meta.shortLabel}
          </span>
          {player && slotScore ? (
            <span
              className={`font-mono-tabular font-bold ${
                slotScore.fit.fit === "PERFECT"
                  ? "text-emerald-300"
                  : slotScore.fit.fit === "FLEX"
                    ? "text-amber-300"
                    : "text-rose-300"
              }`}
              title={slotScore.fit.label}
            >
              {slotScore.effectiveOvr}
            </span>
          ) : previewFit && !blindMode ? (
            <span className={`font-mono-tabular font-bold ${fitTextColor}`}>
              {previewFit.fit === "PERFECT" ? "PAS" : `-${previewFit.penalty}`}
            </span>
          ) : (
            <span className="font-mono-tabular text-white/45">
              {meta.expectedPosition}
            </span>
          )}
        </div>

        {player ? (
          <m.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="my-0.5"
          >
            <JerseyAvatar
              number={player.number}
              primaryColor={player.primaryColor}
              secondaryColor={player.secondaryColor}
              position={player.position}
              tier={player.tier}
              size="sm"
            />
          </m.div>
        ) : (
          <div className="my-1 flex flex-col items-center gap-1">
            <Plus
              className={`h-4 w-4 ${canPlace ? "text-white" : "text-white/35"}`}
            />
            <span className="text-[10px] font-medium text-white/70">
              {canPlace ? "Taruh" : meta.expectedPosition}
            </span>
          </div>
        )}

        <div className="w-full">
          {player ? (
            <div className="flex items-center justify-center gap-1">
              <p className="truncate text-[11px] font-semibold text-[#ebe5d8]">
                {player.name.split(" ").slice(-1)[0]}
              </p>
              {hasSynergy && (
                <Sparkles className="h-2.5 w-2.5 shrink-0 text-[#f97316]" />
              )}
            </div>
          ) : (
            <p className="truncate text-[9px] text-white/50">{meta.label}</p>
          )}
        </div>
      </button>
    );
  };

  return (
    /* Haruko Center Court: Forest-teal gym floor framing the orange playing court */
    <div className="rounded-lg border border-white/15 bg-[#12221b] p-3 shadow-xl sm:p-4">
      {/* Woven Net Tape */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 flex-1 rounded-xs border-y border-white/40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0px,rgba(255,255,255,0.22)_2px,transparent_2px,transparent_8px)]" />
        <span className="font-mono-tabular text-[10px] font-bold tracking-wider text-white/75">
          NET
        </span>
        <div className="h-2 flex-1 rounded-xs border-y border-white/40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0px,rgba(255,255,255,0.22)_2px,transparent_2px,transparent_8px)]" />
      </div>

      {/* Court + Libero Zone with Synergy Link Overlay */}
      <div className="relative">
        {synergyEdges.length > 0 && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            aria-hidden="true"
          >
            {synergyEdges.map((edge) => {
              const p1 = SLOT_COORDS[edge.from];
              const p2 = SLOT_COORDS[edge.to];
              return (
                <line
                  key={edge.key}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#fb923c"
                  strokeWidth="0.7"
                  strokeOpacity="0.6"
                  strokeDasharray="2 1.4"
                />
              );
            })}
          </svg>
        )}

        {/* Orange Court Surface */}
        <div className="relative border-2 border-white/65 bg-[#633219] p-2.5 sm:p-3">
          {/* Front Row (Attack Zone) */}
          <div className="relative z-10 grid grid-cols-3 gap-2">
            {FRONT_ROW.map(renderSlot)}
          </div>

          {/* 3m Attack Line */}
          <div className="my-2.5 border-t-2 border-white/65" />

          {/* Back Row */}
          <div className="relative z-10 grid grid-cols-3 gap-2">
            {BACK_ROW.map(renderSlot)}
          </div>
        </div>

        {/* Libero Zone — aligned 1:1 with the 3-column court grid */}
        <div className="relative z-10 mt-2.5 grid grid-cols-3 items-center gap-2 border-t border-white/10 px-2.5 pt-2.5 sm:px-3">
          <div className="col-span-2 pr-2 text-left">
            <p className="text-xs font-semibold text-[#ebe5d8]">Zona Libero</p>
            <p className="text-[11px] leading-snug text-[#9c9689]">
              Spesialis pertahanan lantai &amp; receive
            </p>
          </div>
          {renderSlot("L")}
        </div>
      </div>
    </div>
  );
}
