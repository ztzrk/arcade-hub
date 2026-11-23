import {
  COURT_SLOTS,
  HARUKO_BRACKET,
  KARASUNO_FORMATIONS,
  type FormationId,
  type HaikyuuDraftMode,
  type LineupMap,
  type TeamEvaluation,
  type TournamentMatchResult,
} from "@arcade-hub/shared";

export interface ShareRunParams {
  mode: HaikyuuDraftMode;
  formationId: FormationId;
  lineup: LineupMap;
  evaluation: TeamEvaluation;
  matchHistory: TournamentMatchResult[];
  completedAt: Date;
  dailyKey?: string | null;
}

function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function buildVerificationCode(params: ShareRunParams): string {
  const lineupSig = COURT_SLOTS.map(
    (s) => `${s.id}:${params.lineup[s.id]?.id ?? "-"}`
  ).join("|");
  const matchSig = params.matchHistory
    .map(
      (m) =>
        `${m.opponent.roundIndex}:${m.karasunoSets}-${m.opponentSets}:${m.sets
          .map((s) => `${s.karasuno}.${s.opponent}`)
          .join(",")}`
    )
    .join("|");

  const payload = `${params.mode}|${params.dailyKey ?? "free"}|${params.formationId}|${params.evaluation.totalOvr.toFixed(1)}|${lineupSig}|${matchSig}|${params.completedAt.getTime()}`;
  const digest = fnv1aHash(payload).toString(36).toUpperCase().padStart(6, "0");
  const ovrTag = Math.round(params.evaluation.totalOvr * 10);
  const wins = params.matchHistory.filter((m) => m.won).length;
  const losses = params.matchHistory.filter((m) => !m.won).length;
  const prefix = params.dailyKey ? "HKD" : "HK";
  return `${prefix}-${ovrTag}-${wins}W${losses}L-${digest.slice(0, 5)}`;
}

export function formatRunTimestamp(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildWhatsAppShareText(
  params: ShareRunParams,
  verificationCode: string
): string {
  const { mode, formationId, lineup, evaluation, matchHistory, completedAt, dailyKey } =
    params;

  const formation =
    KARASUNO_FORMATIONS.find((f) => f.id === formationId)?.name ?? formationId;
  const champion =
    matchHistory.length === HARUKO_BRACKET.length &&
    matchHistory.every((m) => m.won);
  const setsWon = matchHistory.reduce((acc, m) => acc + m.karasunoSets, 0);
  const setsLost = matchHistory.reduce((acc, m) => acc + m.opponentSets, 0);
  const perfectRun = champion && setsLost === 0;
  const eliminatedMatch = matchHistory.find((m) => !m.won);
  const wins = matchHistory.filter((m) => m.won).length;
  const losses = matchHistory.filter((m) => !m.won).length;

  const bracketBar = HARUKO_BRACKET.map((_, idx) => {
    const m = matchHistory[idx];
    if (!m) return "⬜";
    return m.won ? "🟩" : "🟥";
  }).join("");

  const verdictLine = perfectRun
    ? "🏆 *JUARA SEMPURNA HARUKO (0 SET KALAH)*"
    : champion
      ? "🏆 *KARASUNO JUARA NASIONAL HARUKO*"
      : `🏐 *Terhenti di ${eliminatedMatch?.opponent.stageName ?? "Haruko"}*`;

  const rosterLines = COURT_SLOTS.map((slot) => {
    const p = lineup[slot.id];
    const eff = evaluation.slotScores[slot.id]?.effectiveOvr;
    return p
      ? `• ${slot.shortLabel}: #${p.number} ${p.name} (${p.schoolLabel}, ${eff ?? p.ovr})`
      : `• ${slot.shortLabel}: -`;
  }).join("\n");

  const matchLines = matchHistory
    .map(
      (m) =>
        `${m.won ? "✓" : "✕"} ${m.opponent.shortName} ${m.karasunoSets}-${m.opponentSets}`
    )
    .join(" · ");

  const synergiesLine =
    evaluation.activeSynergies.length > 0
      ? `✨ Resonansi: ${evaluation.activeSynergies.map((s) => s.name).join(", ")}`
      : null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?solo=karasuno-haruko`
      : "";

  return [
    dailyKey ? `*KARASUNO: DAILY HARUKO (${dailyKey})*` : `*KARASUNO: ROAD TO HARUKO*`,
    verdictLine,
    `${bracketBar}  (${wins}-${losses} Match | ${setsWon}-${setsLost} Set)`,
    `OVR Tim: *${evaluation.totalOvr.toFixed(1)}* • ${formation} (${mode === "blind" ? "Blind" : "Klasik"})`,
    "",
    `*Lineup Karasuno:*`,
    rosterLines,
    synergiesLine,
    `📋 ${matchLines}`,
    "",
    `✓ Verified: \`${verificationCode}\` • ${formatRunTimestamp(completedAt)}`,
    shareUrl ? `Main solo: ${shareUrl}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function downloadVerifiedResultCard(
  params: ShareRunParams,
  verificationCode: string
): void {
  const { mode, formationId, lineup, evaluation, matchHistory, completedAt, dailyKey } =
    params;

  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1230;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const champion =
    matchHistory.length === HARUKO_BRACKET.length &&
    matchHistory.every((m) => m.won);
  const setsWon = matchHistory.reduce((acc, m) => acc + m.karasunoSets, 0);
  const setsLost = matchHistory.reduce((acc, m) => acc + m.opponentSets, 0);
  const perfectRun = champion && setsLost === 0;
  const eliminatedMatch = matchHistory.find((m) => !m.won);
  const wins = matchHistory.filter((m) => m.won).length;
  const losses = matchHistory.filter((m) => !m.won).length;
  const formation =
    KARASUNO_FORMATIONS.find((f) => f.id === formationId)?.name ?? formationId;

  // Base background
  ctx.fillStyle = "#111210";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle top orange accent bar
  ctx.fillStyle = "#f97316";
  ctx.fillRect(0, 0, canvas.width, 10);

  // Outer architectural frame
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

  // Header
  ctx.fillStyle = params.dailyKey ? "#d4a24c" : "#9c9689";
  ctx.font = "600 18px 'DM Sans', system-ui, sans-serif";
  ctx.fillText(
    params.dailyKey
      ? `KARASUNO HARUKO DRAFT • DAILY CHALLENGE (${params.dailyKey})`
      : "KARASUNO HARUKO DRAFT • OFFICIAL MATCHDAY RECORD",
    68,
    86
  );

  ctx.fillStyle = "#ebe5d8";
  ctx.font = "700 44px 'Fraunces', Georgia, serif";
  const headline = perfectRun
    ? "JUARA SEMPURNA HARUKO"
    : champion
      ? "KARASUNO JUARA NASIONAL"
      : `TERHENTI DI ${(eliminatedMatch?.opponent.shortName ?? "HARUKO").toUpperCase()}`;
  ctx.fillText(headline, 68, 142);

  ctx.fillStyle = perfectRun ? "#d4a24c" : champion ? "#fb923c" : "#9c9689";
  ctx.font = "600 20px 'DM Sans', system-ui, sans-serif";
  const subline = perfectRun
    ? `${HARUKO_BRACKET.length}-0 Tak Terkalahkan • 0 Set Kalah Sepanjang Turnamen`
    : `${formation} • Mode ${mode === "blind" ? "Blind Expert" : "Klasik"}`;
  ctx.fillText(subline, 68, 178);

  // Verified Seal Stamp (top right)
  ctx.save();
  ctx.translate(856, 128);
  ctx.rotate(-0.08);
  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, -84, -30, 168, 60, 8);
  ctx.stroke();
  ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
  ctx.fill();
  ctx.fillStyle = "#34d399";
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("✓ VERIFIED", 0, 7);
  ctx.restore();
  ctx.textAlign = "left";

  // Horizontal rule
  ctx.fillStyle = "#f97316";
  ctx.fillRect(68, 206, canvas.width - 136, 3);

  // Box score (3 columns)
  const boxY = 232;
  const boxW = (canvas.width - 136 - 24) / 3;
  const statsBoxes = [
    { label: "TEAM OVR", value: evaluation.totalOvr.toFixed(1), color: "#f97316" },
    { label: "REKOR MATCH", value: `${wins}-${losses}`, color: "#ebe5d8" },
    { label: "REKOR SET", value: `${setsWon}-${setsLost}`, color: "#34d399" },
  ];

  statsBoxes.forEach((box, idx) => {
    const x = 68 + idx * (boxW + 12);
    ctx.fillStyle = "#171815";
    ctx.fillRect(x, boxY, boxW, 96);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, boxY, boxW, 96);

    ctx.fillStyle = "#9c9689";
    ctx.font = "600 15px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(box.label, x + 20, boxY + 32);

    ctx.fillStyle = box.color;
    ctx.font = "700 38px 'JetBrains Mono', monospace";
    ctx.fillText(box.value, x + 20, boxY + 76);
  });

  // Lineup section
  ctx.fillStyle = "#ebe5d8";
  ctx.font = "700 20px 'DM Sans', system-ui, sans-serif";
  ctx.fillText("LINEUP KARASUNO (7 POSISI)", 68, 376);

  const rowStartY = 396;
  const rowH = 56;
  COURT_SLOTS.forEach((slot, idx) => {
    const y = rowStartY + idx * (rowH + 8);
    const player = lineup[slot.id];
    const eff = evaluation.slotScores[slot.id]?.effectiveOvr;

    ctx.fillStyle = "#161714";
    ctx.fillRect(68, y, canvas.width - 136, rowH);
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.strokeRect(68, y, canvas.width - 136, rowH);

    // School color spine
    ctx.fillStyle = player ? player.secondaryColor : "#3f3f46";
    ctx.fillRect(68, y, 6, rowH);

    // Slot label
    ctx.fillStyle = "#fb923c";
    ctx.font = "700 18px 'JetBrains Mono', monospace";
    ctx.fillText(slot.shortLabel, 92, y + 34);

    if (player) {
      ctx.fillStyle = "#9c9689";
      ctx.font = "600 18px 'JetBrains Mono', monospace";
      ctx.fillText(`#${player.number}`, 160, y + 34);

      ctx.fillStyle = "#ebe5d8";
      ctx.font = "600 20px 'DM Sans', system-ui, sans-serif";
      ctx.fillText(player.name, 224, y + 34);

      ctx.fillStyle = "#9c9689";
      ctx.font = "500 17px 'DM Sans', system-ui, sans-serif";
      ctx.fillText(player.schoolLabel, 580, y + 34);

      ctx.fillStyle = "#d4a24c";
      ctx.font = "700 22px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${eff ?? player.ovr}`, canvas.width - 90, y + 35);
      ctx.textAlign = "left";
    }
  });

  // Resonances line
  const synY = 868;
  ctx.fillStyle = "#9c9689";
  ctx.font = "600 16px 'DM Sans', system-ui, sans-serif";
  const synText =
    evaluation.activeSynergies.length > 0
      ? `Resonansi: ${evaluation.activeSynergies.map((s) => `${s.name} (+${s.ovrBonus})`).join(" • ")}`
      : "Resonansi: Tidak ada kombo khusus aktif";
  ctx.fillText(synText.slice(0, 86), 68, synY);

  // Bracket Strip (2 rows of 5 matches)
  ctx.fillStyle = "#ebe5d8";
  ctx.font = "700 18px 'DM Sans', system-ui, sans-serif";
  ctx.fillText("HASIL PERJALANAN HARUKO (10 BABAK)", 68, 914);

  const cols = 5;
  const bGap = 10;
  const bW = (canvas.width - 136 - bGap * (cols - 1)) / cols;
  const bH = 68;
  HARUKO_BRACKET.forEach((opp, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 68 + col * (bW + bGap);
    const y = 932 + row * (bH + 10);
    const m = matchHistory[idx];

    ctx.fillStyle = m
      ? m.won
        ? "rgba(16, 185, 129, 0.14)"
        : "rgba(244, 63, 94, 0.16)"
      : "#161714";
    ctx.fillRect(x, y, bW, bH);
    ctx.strokeStyle = m
      ? m.won
        ? "rgba(52, 211, 153, 0.5)"
        : "rgba(251, 113, 133, 0.5)"
      : "rgba(255,255,255,0.1)";
    ctx.strokeRect(x, y, bW, bH);

    ctx.fillStyle = "#ebe5d8";
    ctx.font = "700 13px 'DM Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${idx + 1}. ${opp.shortName.slice(0, 10)}`, x + bW / 2, y + 26);

    ctx.fillStyle = m ? (m.won ? "#34d399" : "#fb7185") : "#6b665d";
    ctx.font = "700 19px 'JetBrains Mono', monospace";
    ctx.fillText(
      m ? `${m.karasunoSets}-${m.opponentSets}` : "--",
      x + bW / 2,
      y + 52
    );
  });
  ctx.textAlign = "left";

  // Footer with Verification Hash & Timestamp
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(68, 1110, canvas.width - 136, 1);

  ctx.fillStyle = "#34d399";
  ctx.font = "700 18px 'JetBrains Mono', monospace";
  ctx.fillText(`VERIFIED ID: ${verificationCode}`, 68, 1152);

  ctx.fillStyle = "#9c9689";
  ctx.font = "500 17px 'DM Sans', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(formatRunTimestamp(completedAt), canvas.width - 68, 1152);
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.download = `karasuno-haruko-${verificationCode.toLowerCase()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
