import type { PlayerTier, VolleyPosition } from "@arcade-hub/shared";

interface JerseyAvatarProps {
  number: number;
  primaryColor: string;
  secondaryColor: string;
  position: VolleyPosition;
  tier?: PlayerTier;
  blind?: boolean;
  size?: "sm" | "md" | "lg";
}

const TIER_RING: Record<PlayerTier, string> = {
  SSR: "drop-shadow-[0_0_10px_rgba(249,115,22,0.55)]",
  SR: "drop-shadow-[0_0_6px_rgba(212,162,76,0.35)]",
  R: "",
  N: "",
};

function getContrastText(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111210" : "#f8fafc";
}

export function JerseyAvatar({
  number,
  primaryColor,
  secondaryColor,
  position,
  tier = "R",
  blind = false,
  size = "md",
}: JerseyAvatarProps) {
  const dim =
    size === "sm" ? "h-11 w-11" : size === "lg" ? "h-16 w-16" : "h-13 w-13";
  const textColor = getContrastText(primaryColor);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${
        blind ? "" : TIER_RING[tier]
      }`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full overflow-visible">
        {/* Jersey Body */}
        <path
          d="M18 10 L25 8 Q32 14 39 8 L46 10 L57 20 L51 30 L46 26 L46 56 Q32 58 18 56 L18 26 L13 30 L7 20 Z"
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Side & Shoulder Stripes */}
        <path
          d="M18 26 L18 55 M46 26 L46 55"
          stroke={secondaryColor}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Collar V-neck */}
        <path
          d="M25 9 L32 17 L39 9"
          fill="none"
          stroke={secondaryColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Jersey Number */}
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fill={textColor}
          fontSize="18"
          fontWeight="800"
          fontFamily="JetBrains Mono, monospace"
        >
          {blind ? "?" : number}
        </text>
      </svg>

      {!blind && (
        <span
          className="font-mono-tabular absolute -bottom-1 -right-1 rounded border border-black/40 px-1 py-[1px] text-[9px] font-bold leading-none shadow"
          style={{
            backgroundColor: secondaryColor,
            color: getContrastText(secondaryColor),
          }}
        >
          {position}
        </span>
      )}
    </div>
  );
}
