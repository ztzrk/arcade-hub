import { motion } from "framer-motion";
import type { CardRank } from "@arcade-hub/shared";

interface PlayingCardProps {
  rank?: CardRank;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  statusRing?: "match" | "lie";
  onClick?: () => void;
}

const SIZE_CLASSES = {
  sm: "h-20 w-14 rounded-lg",
  md: "h-32 w-22 rounded-xl sm:h-36 sm:w-25",
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

function CardEmblem({ rank }: { rank: CardRank }) {
  if (rank === "KING") {
    return (
      <svg viewBox="0 0 48 48" className="h-8 w-8 text-[#9a6318]" fill="currentColor">
        <path d="M8 34h32l3-17-10 7-9-12-9 12-10-7 3 17zm1 4h30v3H9v-3z" />
      </svg>
    );
  }
  if (rank === "QUEEN") {
    return (
      <svg viewBox="0 0 48 48" className="h-8 w-8 text-[#a82424]" fill="currentColor">
        <path d="M24 8l5 9 10-4-4 18H13L9 13l10 4 5-9zm-11 27h22v4H13v-4z" />
        <circle cx="24" cy="6" r="2.2" />
      </svg>
    );
  }
  if (rank === "ACE") {
    return (
      <svg viewBox="0 0 48 48" className="h-8 w-8 text-[#1d1e1b]" fill="currentColor">
        <path d="M24 6C17 15 10 21 10 28a8 8 0 0013 6.2V40h-5v3h12v-3h-5v-5.8A8 8 0 0038 28c0-7-7-13-14-22z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 text-[#a82424]" fill="currentColor">
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

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      animate={{ y: selected ? -14 : 0 }}
      whileHover={!disabled && onClick ? { y: selected ? -16 : -5 } : undefined}
      whileTap={!disabled && onClick ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      className={`${sizeClass} ${ringClass} relative flex flex-col justify-between border bg-[#f5efe2] p-2 shadow-[0_10px_22px_rgba(0,0,0,0.48)] select-none ${
        onClick && !disabled ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className={`self-start font-mono-tabular text-sm font-bold leading-none ${meta.colorClass}`}>
        {meta.short}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <CardEmblem rank={rank} />
        <span className={`font-mono-tabular text-[10px] font-bold tracking-wider ${meta.colorClass}`}>
          {meta.label}
        </span>
      </div>

      <div
        className={`rotate-180 self-end font-mono-tabular text-sm font-bold leading-none ${meta.colorClass}`}
      >
        {meta.short}
      </div>
    </motion.button>
  );
}
