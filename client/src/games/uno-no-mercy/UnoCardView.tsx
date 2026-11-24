import { m } from "framer-motion";
import type { UnoCard, UnoCardColor } from "@arcade-hub/shared";

const CARD_SURFACE: Record<
  UnoCardColor,
  { bg: string; border: string; oval: string; text: string }
> = {
  RED: {
    bg: "bg-gradient-to-br from-[#e24a3f] via-[#c73026] to-[#871b14]",
    border: "border-[#fca5a5]/55",
    oval: "border-[#fecaca]/35 bg-[#7f1d1d]/35",
    text: "text-white",
  },
  YELLOW: {
    bg: "bg-gradient-to-br from-[#f6c431] via-[#d99b16] to-[#966509]",
    border: "border-[#fef08a]/65",
    oval: "border-[#fef9c3]/45 bg-[#713f12]/25",
    text: "text-[#fffbeb]",
  },
  GREEN: {
    bg: "bg-gradient-to-br from-[#23b559] via-[#158840] to-[#0d5728]",
    border: "border-[#86efac]/55",
    oval: "border-[#bbf7d0]/35 bg-[#14532d]/35",
    text: "text-white",
  },
  BLUE: {
    bg: "bg-gradient-to-br from-[#3b82f6] via-[#1d5ed8] to-[#17398a]",
    border: "border-[#93c5fd]/55",
    oval: "border-[#bfdbfe]/35 bg-[#1e3a8a]/35",
    text: "text-white",
  },
  WILD: {
    bg: "bg-gradient-to-br from-[#26282b] via-[#17181b] to-[#0b0c0e]",
    border: "border-white/35",
    oval: "border-white/20 bg-white/[0.04]",
    text: "text-[#f8fafc]",
  },
};

function getCornerLabel(card: UnoCard): string {
  switch (card.kind) {
    case "NUMBER":
      return String(card.value ?? 0);
    case "SKIP":
      return "⊘";
    case "REVERSE":
      return "⇄";
    case "DRAW_2":
      return "+2";
    case "DISCARD_ALL":
      return "💥";
    case "WILD":
      return "★";
    case "WILD_DRAW_4":
      return "+4";
    case "WILD_DRAW_6":
      return "+6";
    case "WILD_DRAW_10":
      return "+10";
  }
}

function getCenterDisplay(card: UnoCard): { main: string; sub?: string } {
  switch (card.kind) {
    case "NUMBER":
      return card.value === 0
        ? { main: "0", sub: "TUKAR" }
        : { main: String(card.value ?? 0) };
    case "SKIP":
      return { main: "⊘", sub: "SKIP" };
    case "REVERSE":
      return { main: "⇄", sub: "BALIK" };
    case "DRAW_2":
      return { main: "+2" };
    case "DISCARD_ALL":
      return { main: "💥", sub: "SEMUA" };
    case "WILD":
      return { main: "WILD", sub: "WARNA" };
    case "WILD_DRAW_4":
      return { main: "+4", sub: "WILD" };
    case "WILD_DRAW_6":
      return { main: "+6", sub: "NO MERCY" };
    case "WILD_DRAW_10":
      return { main: "+10", sub: "BRUTAL" };
  }
}

interface UnoCardViewProps {
  card: UnoCard;
  playable?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  size?: "md" | "lg";
  onClick?: () => void;
}

/**
 * Tactile UNO: No Mercy card face with color gradients, prism wild emblem,
 * and playability emphasis.
 */
export function UnoCardView({
  card,
  playable = false,
  dimmed = false,
  selected = false,
  size = "md",
  onClick,
}: UnoCardViewProps) {
  const surface = CARD_SURFACE[card.color];
  const corner = getCornerLabel(card);
  const center = getCenterDisplay(card);

  const sizeClass =
    size === "lg"
      ? "h-28 w-20 rounded-xl sm:h-32 sm:w-22"
      : "h-24 w-16 rounded-xl sm:h-28 sm:w-19";

  return (
    <m.button
      type="button"
      disabled={!onClick || !playable}
      onClick={onClick}
      whileHover={playable ? { y: -8, scale: 1.04 } : undefined}
      whileTap={playable ? { scale: 0.96 } : undefined}
      className={`relative flex shrink-0 select-none flex-col justify-between border-2 p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.45)] transition-all ${sizeClass} ${surface.bg} ${surface.border} ${surface.text} ${
        selected
          ? "ring-2 ring-white -translate-y-2 shadow-[0_0_20px_rgba(255,255,255,0.45)]"
          : playable
            ? "cursor-pointer ring-1 ring-white/40 hover:ring-white"
            : dimmed
              ? "cursor-default opacity-45 saturate-75"
              : "cursor-default"
      }`}
    >
      {/* Top-left index */}
      <span className="font-mono-tabular self-start text-[11px] font-extrabold leading-none drop-shadow sm:text-xs">
        {corner}
      </span>

      {/* Center oval emblem */}
      <div
        className={`relative mx-auto flex h-[56%] w-[86%] flex-col items-center justify-center rounded-full border ${surface.oval}`}
      >
        {card.color === "WILD" && (
          <div
            className="pointer-events-none absolute inset-1 rounded-full opacity-25"
            style={{
              background:
                "conic-gradient(#dc3c32 0deg 90deg, #eab308 90deg 180deg, #16a34a 180deg 270deg, #2563eb 270deg 360deg)",
            }}
          />
        )}
        <span
          className={`relative z-10 font-mono-tabular font-black leading-none drop-shadow ${
            center.main.length >= 4
              ? "text-sm sm:text-base"
              : center.main.length >= 3
                ? "text-lg sm:text-xl"
                : "text-xl sm:text-2xl"
          }`}
        >
          {center.main}
        </span>
        {center.sub && (
          <span className="relative z-10 mt-0.5 text-[7px] font-bold tracking-wider uppercase opacity-90 sm:text-[8px]">
            {center.sub}
          </span>
        )}
      </div>

      {/* Bottom-right mirrored index */}
      <span className="font-mono-tabular rotate-180 self-end text-[11px] font-extrabold leading-none drop-shadow sm:text-xs">
        {corner}
      </span>
    </m.button>
  );
}
