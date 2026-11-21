import { motion } from "framer-motion";
import type { CardRank } from "@arcade-hub/shared";

interface PlayingCardProps {
  rank?: CardRank;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "hand";
  statusRing?: "match" | "lie";
  onClick?: () => void;
}

const SIZE_CLASSES = {
  sm: "h-15 w-11 rounded-md sm:h-20 sm:w-14 sm:rounded-lg",
  md: "h-28 w-20 rounded-xl sm:h-36 sm:w-25",
  hand: "h-24 w-[60px] rounded-lg sm:h-36 sm:w-25 sm:rounded-xl",
} as const;

const RANK_META: Record<
  CardRank,
  { short: string; label: string; colorClass: string }
> = {
  KING: { short: "K", label: "KING", colorClass: "text-[#8e5b16]" },
  QUEEN: { short: "Q", label: "QUEEN", colorClass: "text-[#a82424]" },
  ACE: { short: "A", label: "ACE", colorClass: "text-[#1d1e1b]" },
  JOKER: { short: "★", label: "JOKER", colorClass: "text-[#a82424]" },
};

function CardEmblem({
  rank,
  size = "md",
}: {
  rank: CardRank;
  size?: "sm" | "md" | "hand";
}) {
  const iconClass =
    size === "sm"
      ? "h-5 w-5 sm:h-6 sm:w-6"
      : size === "hand"
        ? "h-6 w-6 sm:h-8 sm:w-8"
        : "h-7 w-7 sm:h-8 sm:w-8";

  if (rank === "KING") {
    return (
      <svg viewBox="0 0 48 48" className={`${iconClass} text-[#9a6318]`} fill="currentColor">
        <path d="M8 34h32l3-17-10 7-9-12-9 12-10-7 3 17zm1 4h30v3H9v-3z" />
      </svg>
    );
  }
  if (rank === "QUEEN") {
    return (
      <svg viewBox="0 0 48 48" className={`${iconClass} text-[#a82424]`} fill="currentColor">
        <path d="M24 8l5 9 10-4-4 18H13L9 13l10 4 5-9zm-11 27h22v4H13v-4z" />
        <circle cx="24" cy="6" r="2.2" />
      </svg>
    );
  }
  if (rank === "ACE") {
    return (
      <svg viewBox="0 0 48 48" className={`${iconClass} text-[#1d1e1b]`} fill="currentColor">
        <path d="M24 6C17 15 10 21 10 28a8 8 0 0013 6.2V40h-5v3h12v-3h-5v-5.8A8 8 0 0038 28c0-7-7-13-14-22z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={`${iconClass} text-[#a82424]`} fill="currentColor">
      <path d="M24 7l4.2 10.5L39 18.8l-8 7.6 2 11.1L24 32l-9 5.5 2-11.1-8-7.6 10.8-1.3L24 7z" />
    </svg>
  );
}

export function PlayingCard({
  rank = "ACE",
  faceDown = false,
  selected = false,
  disabled = false,
  size = "md",
  statusRing,
  onClick,
}: PlayingCardProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (faceDown) {
    return (
      <div
        className={`${sizeClass} card-back-pattern flex items-center justify-center border border-[#ebe5d8]/25 shadow-[0_8px_20px_rgba(0,0,0,0.45)] select-none`}
      >
        <div className="h-[82%] w-[78%] rounded border border-[#ebe5d8]/20" />
      </div>
    );
  }

  const meta = RANK_META[rank];
  const ringClass =
    statusRing === "match"
      ? "ring-2 ring-emerald-500 border-emerald-600"
      : statusRing === "lie"
      ? "ring-2 ring-[#d9483b] border-[#d9483b]"
      : selected
      ? "border-[#d4a24c] ring-2 ring-[#d4a24c]"
      : "border-[#cfc4ae]";

  const paddingClass =
    size === "sm"
      ? "p-1 sm:p-1.5"
      : size === "hand"
        ? "p-1.5 sm:p-2"
        : "p-1.5 sm:p-2";
  const cornerTextClass =
    size === "sm"
      ? "text-[10px] sm:text-xs"
      : size === "hand"
        ? "text-xs sm:text-sm"
        : "text-xs sm:text-sm";
  const labelTextClass =
    size === "sm"
      ? "text-[7px] sm:text-[8px]"
      : size === "hand"
        ? "text-[8px] sm:text-[10px]"
        : "text-[9px] sm:text-[10px]";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      animate={{ y: selected ? -12 : 0 }}
      whileTap={!disabled && onClick ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      className={`${sizeClass} ${paddingClass} ${ringClass} relative flex flex-col justify-between border bg-[#f5efe2] shadow-[0_10px_22px_rgba(0,0,0,0.48)] select-none ${
        onClick && !disabled
          ? "cursor-pointer [@media(hover:hover)]:hover:brightness-[1.03]"
          : "cursor-default"
      }`}
    >
      <div className={`self-start font-mono-tabular font-bold leading-none ${cornerTextClass} ${meta.colorClass}`}>
        {meta.short}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <CardEmblem rank={rank} size={size} />
        <span className={`font-mono-tabular font-bold tracking-wider ${labelTextClass} ${meta.colorClass}`}>
          {meta.label}
        </span>
      </div>

      <div
        className={`rotate-180 self-end font-mono-tabular font-bold leading-none ${cornerTextClass} ${meta.colorClass}`}
      >
        {meta.short}
      </div>
    </motion.button>
  );
}
