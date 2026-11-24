import {
  ULAR_TANGGA_LADDERS,
  ULAR_TANGGA_SNAKES,
  tileToGridCoord,
} from "@arcade-hub/shared";

interface Point {
  x: number;
  y: number;
}

function tileCenter(tile: number): Point {
  const { row, col } = tileToGridCoord(tile);
  return {
    x: col * 100 + 50,
    y: row * 100 + 50,
  };
}

const SNAKE_PALETTES = [
  { body: "#e05a4f", stripe: "#f7b2a8", belly: "#7c211b" },
  { body: "#34b38a", stripe: "#a7f3d0", belly: "#115e46" },
  { body: "#c07be8", stripe: "#ead0fb", belly: "#5b2182" },
  { body: "#e89b3c", stripe: "#fde1b4", belly: "#7c470b" },
] as const;

function buildSnakePath(from: Point, to: Point, flipWave: boolean): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Unit perpendicular vector
  const nx = (-dy / len) * (flipWave ? -1 : 1);
  const ny = (dx / len) * (flipWave ? -1 : 1);
  const waveAmp = Math.min(48, Math.max(24, len * 0.14));

  const p1 = {
    x: from.x + dx * 0.25 + nx * waveAmp,
    y: from.y + dy * 0.25 + ny * waveAmp,
  };
  const mid = {
    x: from.x + dx * 0.5,
    y: from.y + dy * 0.5,
  };
  const p2 = {
    x: from.x + dx * 0.75 - nx * waveAmp,
    y: from.y + dy * 0.75 - ny * waveAmp,
  };

  return `M ${from.x} ${from.y} Q ${p1.x} ${p1.y} ${mid.x} ${mid.y} T ${to.x} ${to.y}`;
}

interface BoardOverlaySvgProps {
  highlightedPortal?: { from: number; to: number; kind: "LADDER" | "SNAKE" } | null;
}

/**
 * Crisp 1000x1000 SVG overlay rendering bamboo-gold ladders and curved snakes
 * aligned cleanly to tile centers on the 10x10 board.
 */
export function BoardOverlaySvg({ highlightedPortal }: BoardOverlaySvgProps) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="ut-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Ladders */}
      {ULAR_TANGGA_LADDERS.map((ladder) => {
        const start = tileCenter(ladder.from);
        const end = tileCenter(ladder.to);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        // Perpendicular offset for the two ladder rails
        const halfWidth = 14;
        const px = -uy * halfWidth;
        const py = ux * halfWidth;

        const rungCount = Math.max(3, Math.floor(len / 42));
        const rungs: { x1: number; y1: number; x2: number; y2: number }[] = [];
        for (let i = 1; i < rungCount; i++) {
          const t = i / rungCount;
          const cx = start.x + dx * t;
          const cy = start.y + dy * t;
          rungs.push({
            x1: cx + px,
            y1: cy + py,
            x2: cx - px,
            y2: cy - py,
          });
        }

        const isActive =
          highlightedPortal?.kind === "LADDER" &&
          highlightedPortal.from === ladder.from;

        return (
          <g
            key={`ladder-${ladder.from}-${ladder.to}`}
            filter="url(#ut-shadow)"
            opacity={isActive ? 1 : 0.88}
          >
            {/* Dark backing for contrast */}
            <line
              x1={start.x + px}
              y1={start.y + py}
              x2={end.x + px}
              y2={end.y + py}
              stroke="#1f1708"
              strokeWidth={isActive ? 11 : 9}
              strokeLinecap="round"
            />
            <line
              x1={start.x - px}
              y1={start.y - py}
              x2={end.x - px}
              y2={end.y - py}
              stroke="#1f1708"
              strokeWidth={isActive ? 11 : 9}
              strokeLinecap="round"
            />

            {/* Rungs */}
            {rungs.map((r, idx) => (
              <line
                key={idx}
                x1={r.x1}
                y1={r.y1}
                x2={r.x2}
                y2={r.y2}
                stroke={isActive ? "#fde68a" : "#d4a24c"}
                strokeWidth={5.5}
                strokeLinecap="round"
              />
            ))}

            {/* Gold rails */}
            <line
              x1={start.x + px}
              y1={start.y + py}
              x2={end.x + px}
              y2={end.y + py}
              stroke={isActive ? "#fef08a" : "#e5b865"}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <line
              x1={start.x - px}
              y1={start.y - py}
              x2={end.x - px}
              y2={end.y - py}
              stroke={isActive ? "#fef08a" : "#e5b865"}
              strokeWidth={6}
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Snakes */}
      {ULAR_TANGGA_SNAKES.map((snake, idx) => {
        const head = tileCenter(snake.from);
        const tail = tileCenter(snake.to);
        const path = buildSnakePath(head, tail, idx % 2 === 0);
        const palette = SNAKE_PALETTES[idx % SNAKE_PALETTES.length]!;
        const isActive =
          highlightedPortal?.kind === "SNAKE" &&
          highlightedPortal.from === snake.from;

        const angleRad = Math.atan2(tail.y - head.y, tail.x - head.x);
        const angleDeg = (angleRad * 180) / Math.PI;

        return (
          <g
            key={`snake-${snake.from}-${snake.to}`}
            filter="url(#ut-shadow)"
            opacity={isActive ? 1 : 0.92}
          >
            {/* Outer outline */}
            <path
              d={path}
              fill="none"
              stroke={palette.belly}
              strokeWidth={isActive ? 22 : 18}
              strokeLinecap="round"
            />
            {/* Main body */}
            <path
              d={path}
              fill="none"
              stroke={palette.body}
              strokeWidth={isActive ? 15 : 12}
              strokeLinecap="round"
            />
            {/* Dotted pattern */}
            <path
              d={path}
              fill="none"
              stroke={palette.stripe}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="3 18"
            />
            {/* Tail tip */}
            <circle cx={tail.x} cy={tail.y} r={5} fill={palette.body} stroke={palette.belly} strokeWidth={2} />

            {/* Stylized Snake Head at `from` */}
            <g transform={`translate(${head.x}, ${head.y}) rotate(${angleDeg + 180})`}>
              {/* Forked tongue */}
              <path
                d="M 14 0 L 23 0 M 20 0 L 25 -4 M 20 0 L 25 4"
                stroke="#fda4af"
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
              />
              {/* Head shape */}
              <ellipse
                cx={0}
                cy={0}
                rx={15}
                ry={12}
                fill={palette.body}
                stroke={palette.belly}
                strokeWidth={2.5}
              />
              {/* Eyes */}
              <circle cx={5} cy={-5} r={3.2} fill="#fffbeb" />
              <circle cx={5} cy={5} r={3.2} fill="#fffbeb" />
              <circle cx={6} cy={-5} r={1.6} fill="#111210" />
              <circle cx={6} cy={5} r={1.6} fill="#111210" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
