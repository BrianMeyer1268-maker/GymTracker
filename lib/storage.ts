import type { AppData, BodyCompEntry, Machine, Phase, WorkoutGoal } from "./types";
import { GOALS, PHASES } from "./types";
import { SEED_MACHINES } from "./catalog";
import { todayISO } from "./date";
import { allPhotos, restorePhotos } from "./photos";

const KEY = "ironcompass:v3";
const V2_KEY = "ironcompass:v2"; // previous catalog build — carry history forward
const V1_KEY = "gym-tracker:v1"; // original "Gym Tracker" build — carry body comp

const SEED_BODYCOMP: BodyCompEntry[] = [
  { id: "bc-2026-05-16", date: "2026-05-16", weight: 230.4, bodyFat: 27.4, skeletalMuscle: 96.6, visceralFat: 11 },
  { id: "bc-2026-05-23", date: "2026-05-23", weight: 230.6, bodyFat: 26.9, skeletalMuscle: 97.2, visceralFat: 11 },
];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function seededDefault(): AppData {
  return {
    version: 3,
    phase: "recomp",
    machines: SEED_MACHINES.map((m) => ({ ...m })),
    logs: [],
    bodyComp: SEED_BODYCOMP.map((e) => ({ ...e })),
    flagged: [],
    sessions: [],
    observations: [],
    switchEvents: [],
    today: undefined,
  };
}

/** Migrate the legacy `photoId` field to `gymPhotoId`. */
function normalizeMachine(m: Machine): Machine {
  if (m.photoId && !m.gymPhotoId) return { ...m, gymPhotoId: m.photoId, photoId: undefined };
  return m;
}

/** Keep the user's machines, but add any new seed machines they don't have yet. */
function mergeMachines(userMachines: unknown): Machine[] {
  if (!Array.isArray(userMachines) || userMachines.length === 0) return SEED_MACHINES.map((m) => ({ ...m }));
  const merged = (userMachines as Machine[]).map(normalizeMachine);
  const have = new Set(merged.map((m) => m.id));
  for (const s of SEED_MACHINES) if (!have.has(s.id)) merged.push({ ...s });
  return merged;
}

function migrate(raw: unknown): AppData {
  const base = seededDefault();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<AppData>;
  const phase: Phase = PHASES.includes(d.phase as Phase) ? (d.phase as Phase) : "recomp";
  let today =
    d.today && typeof d.today === "object" && (d.today as AppData["today"])?.date === todayISO()
      ? { ...(d.today as NonNullable<AppData["today"]>), busy: Array.isArray((d.today as any).busy) ? (d.today as any).busy : [] }
      : undefined;
  if (today && today.goal && !GOALS.includes(today.goal as WorkoutGoal)) {
    today = { ...today, goal: undefined, skipped: [] };
  }
  return {
    version: 3,
    phase,
    machines: mergeMachines(d.machines),
    logs: Array.isArray(d.logs) ? d.logs : [],
    bodyComp: Array.isArray(d.bodyComp) ? d.bodyComp : base.bodyComp,
    flagged: Array.isArray(d.flagged) ? d.flagged : [],
    // Keep timing history bounded.
    sessions: Array.isArray(d.sessions) ? d.sessions.slice(-500) : [],
    observations: Array.isArray(d.observations) ? d.observations.slice(-2000) : [],
    switchEvents: Array.isArray(d.switchEvents) ? d.switchEvents.slice(-1000) : [],
    today,
  };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return seededDefault();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));

    // First run of the Matrix catalog: keep history/body-comp from older builds,
    // but adopt the fresh Matrix machine catalog.
    const seeded = seededDefault();
    const v2 = window.localStorage.getItem(V2_KEY);
    const v1 = window.localStorage.getItem(V1_KEY);
    if (v2) {
      const p = JSON.parse(v2);
      if (PHASES.includes(p?.phase)) seeded.phase = p.phase;
      if (Array.isArray(p?.logs)) seeded.logs = p.logs;
      if (Array.isArray(p?.bodyComp) && p.bodyComp.length) seeded.bodyComp = p.bodyComp;
      if (Array.isArray(p?.flagged)) seeded.flagged = p.flagged;
    } else if (v1) {
      const p = JSON.parse(v1);
      if (Array.isArray(p?.bodyComp) && p.bodyComp.length) seeded.bodyComp = p.bodyComp;
    }
    window.localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return seededDefault();
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

interface Backup extends AppData {
  schema: "iron-compass";
  exportedAt: string;
  photos: Record<string, string>;
}

export function exportData(data: AppData): void {
  if (typeof window === "undefined") return;
  const backup: Backup = {
    schema: "iron-compass",
    exportedAt: new Date().toISOString(),
    photos: allPhotos(),
    ...data,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `iron-compass-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse a backup file, restore its photos, and return the AppData to load. */
export function applyImport(text: string): AppData {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.logs) || !Array.isArray(parsed.bodyComp)) {
    throw new Error("Not a valid Iron Compass backup.");
  }
  restorePhotos(parsed.photos);
  return migrate(parsed);
}
