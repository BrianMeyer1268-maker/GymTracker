import type { GymZone, GymZoneType, Machine } from "./types";

/** Zone tint on the rough floor map. */
export const ZONE_TYPE_COLOR: Record<GymZoneType, string> = {
  cardio: "#38bdf8",
  machines: "#a78bfa",
  "free-weights": "#34d399",
  cables: "#f472b6",
  racks: "#fb923c",
  turf: "#84cc16",
  mobility: "#facc15",
  classes: "#22d3ee",
  unknown: "#64748b",
};

export const ZONE_TYPE_ICON: Record<GymZoneType, string> = {
  cardio: "🏃",
  machines: "🏋️",
  "free-weights": "💪",
  cables: "🧵",
  racks: "🔩",
  turf: "🌱",
  mobility: "🧘",
  classes: "🧑‍🤝‍🧑",
  unknown: "❓",
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lay zones out as a simple grid (0..1 floor coordinates). */
export function zoneRects(zones: GymZone[], cols = 2): Record<string, Rect> {
  const rows = Math.max(1, Math.ceil(zones.length / cols));
  const out: Record<string, Rect> = {};
  zones.forEach((z, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out[z.id] = { x: col / cols, y: row / rows, w: 1 / cols, h: 1 / rows };
  });
  return out;
}

/** Which zone contains a point (0..1). */
export function zoneAtPoint(rects: Record<string, Rect>, x: number, y: number): string | undefined {
  for (const [id, r] of Object.entries(rects)) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return id;
  }
  return undefined;
}

/** A machine's pin position (0..1): explicit mapX/mapY, else tucked into its zone. */
export function pinPos(machine: Machine, rect: Rect | undefined, idxInZone: number, countInZone: number): { x: number; y: number } {
  if (typeof machine.mapX === "number" && typeof machine.mapY === "number") return { x: machine.mapX, y: machine.mapY };
  if (!rect) return { x: 0.5, y: 0.5 };
  const per = Math.min(4, Math.max(1, Math.round(Math.sqrt(countInZone))));
  const rowsN = Math.max(1, Math.ceil(countInZone / per));
  const c = idxInZone % per;
  const r = Math.floor(idxInZone / per);
  const x = rect.x + rect.w * ((c + 0.5) / per);
  const y = rect.y + rect.h * (0.46 + 0.5 * ((r + 0.5) / rowsN));
  return { x, y };
}
