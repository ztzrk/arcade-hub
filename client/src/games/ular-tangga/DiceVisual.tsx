import { m } from "framer-motion";

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

interface DiceVisualProps {
  value: number;
  rollKey: string | number;
  variant?: "normal" | "turbo" | "cursed" | "sniper";
  size?: "sm" | "md";
}

/**
 * Tactile animated die face with pips and variant-specific styling.
 */
export function DiceVisual({
  value,
  rollKey,
  variant = "normal",
  size = "md",
}: DiceVisualProps) {
  const pips = PIP_POSITIONS[Math.max(1, Math.min(6, value))] ?? PIP_POSITIONS[1]!;
  const sizeClass = size === "sm" ? "h-10 w-10 rounded-lg" : "h-12 w-12 rounded-xl";

  const frameStyle =
    variant === "turbo"
      ? "border-amber-300/70 bg-gradient-to-br from-[#fef3c7] to-[#f59e0b] text-[#2c1902]"
      : variant === "cursed"
        ? "border-sky-300/70 bg-gradient-to-br from-[#e0f2fe] to-[#60a5fa] text-[#0c2744]"
        : variant === "sniper"
          ? "border-emerald-300/70 bg-gradient-to-br from-[#d1fae5] to-[#34d399] text-[#062e22]"
          : "border-[#e7decb]/70 bg-gradient-to-br from-[#fbf8f1] to-[#dfd5c0] text-[#171815]";

  return (
    <m.div
      key={rollKey}
      initial={{ rotate: -22, scale: 0.78, y: -6 }}
      animate={{ rotate: 0, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      className={`relative shrink-0 border-2 shadow-[0_6px_14px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.6)] ${sizeClass} ${frameStyle}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {pips.map(([cx, cy], idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={value === 1 ? 12 : 9.5}
            fill={value === 1 && variant === "normal" ? "#c8382c" : "currentColor"}
          />
        ))}
      </svg>
    </m.div>
  );
}
