import type { AppData, BodyCompEntry, GymLocation, Machine, Phase, WorkoutGoal } from "./types";
import { GOALS, PHASES } from "./types";
import { SEED_MACHINES } from "./catalog";
import { seedLocations, DEFAULT_LOCATION_BRIAN } from "./gyms";
import { todayISO } from "./date";
import { allPhotos, restorePhotos } from "./photos";

const SEED_BODYCOMP: BodyCompEntry[] = [
  { id: "bc-2026-05-16", date: "2026-05-16", weight: 230.4, bodyFat: 27.4, skeletalMuscle: 96.6, visceralFat: 11 },
  { id: "bc-2026-05-23", date: "2026-05-23", weight: 230.6, bodyFat: 26.9, skeletalMuscle: 97.2, visceralFat: 11 },
];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Default data for the first/primary profile (includes the seeded body-comp readings). */
export function seededDefault(): AppData {
  return {
    version: 3,
    phase: "recomp",
    machines: SEED_MACHINES.map((m) => normalizeMachine({ ...m })),
    logs: [],
    bodyComp: SEED_BODYCOMP.map((e) => ({ ...e })),
    flagged: [],
    sessions: [],
    observations: [],
    switchEvents: [],
    today: undefined,
    locations: seedLocations(),
    defaultLocationId: DEFAULT_LOCATION_BRIAN,
    activeLocationId: undefined,
    favoriteLocationIds: [],
    activityLogs: [],
  };
}

/** Default data for a *new* profile — no inherited body-comp / history. */
export function freshProfileData(): AppData {
  return { ...seededDefault(), bodyComp: [], activityLogs: [] };
}

/** Normalize a stored machine: migrate legacy `photoId`, and drop the brand/series
 *  prefix from the name (e.g. "Versa Converging Chest Press" → "Converging Chest
 *  Press") so names are shorter and easier to search. The series stays in `model`. */
function normalizeMachine(m: Machine): Machine {
  let out: Machine = m;
  if (out.photoId && !out.gymPhotoId) out = { ...out, gymPhotoId: out.photoId, photoId: undefined };
  if (out.model && out.name.startsWith(`${out.model} `)) {
    out = { ...out, name: out.name.slice(out.model.length + 1) };
  }
  return out;
}

const SEED_BY_ID = new Map(SEED_MACHINES.map((s) => [s.id, s]));

/** Backfill new seed-derived fields (catalog image, default zone, exercises) onto a
 *  stored machine without overriding the user's own edits. */
function backfillSeed(m: Machine): Machine {
  const s = SEED_BY_ID.get(m.id);
  if (!s) return m;
  return {
    ...m,
    catalogPhoto: m.catalogPhoto ?? s.catalogPhoto,
    catalogPage: m.catalogPage ?? s.catalogPage,
    catalogSource: m.catalogSource ?? s.catalogSource,
    floorId: m.floorId ?? s.floorId,
    zoneId: m.zoneId ?? s.zoneId,
    exercises: m.exercises ?? s.exercises,
  };
}

/** Keep the user's machines, but add any new seed machines they don't have yet. */
export function mergeMachines(userMachines: unknown): Machine[] {
  if (!Array.isArray(userMachines) || userMachines.length === 0) return SEED_MACHINES.map((m) => normalizeMachine({ ...m }));
  const merged = (userMachines as Machine[]).map((m) => backfillSeed(normalizeMachine(m)));
  const have = new Set(merged.map((m) => m.id));
  for (const s of SEED_MACHINES) if (!have.has(s.id)) merged.push(normalizeMachine({ ...s }));
  return merged;
}

/**
 * Restore the default machine catalog without clobbering user data: re-add any
 * missing seed machines and un-archive seed machines, while preserving photos,
 * ratings, custom machines, etc. Used by the "Restore default machines" action
 * and as an auto-heal when a profile somehow ends up with no usable machines.
 */
export function restoreSeeds(machines: Machine[]): Machine[] {
  const byId = new Map<string, Machine>(machines.map((m) => [m.id, m]));
  for (const s of SEED_MACHINES) {
    const ex = byId.get(s.id);
    if (!ex) byId.set(s.id, normalizeMachine({ ...s }));
    else if (ex.archived) byId.set(s.id, { ...ex, archived: false });
  }
  return Array.from(byId.values());
}

/** True when at least one machine is usable (not archived). */
export function hasActiveMachine(machines: Machine[]): boolean {
  return machines.some((m) => !m.archived);
}

/** Backfill seed floors/zones onto stored locations (by id) without overriding. */
function backfillLocations(locations: GymLocation[]): GymLocation[] {
  const seedById = new Map(seedLocations().map((l) => [l.id, l]));
  return locations.map((l) => {
    const s = seedById.get(l.id);
    if (!s) return l;
    return { ...l, floors: l.floors ?? s.floors, zones: l.zones ?? s.zones };
  });
}

/** Validate / normalize a raw stored AppData blob. */
export function migrate(raw: unknown): AppData {
  const base = freshProfileData();
  if (!raw || typeof raw !== "object") return seededDefault();
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
    locations: Array.isArray(d.locations) && d.locations.length ? backfillLocations(d.locations as GymLocation[]) : seedLocations(),
    defaultLocationId: d.defaultLocationId ?? DEFAULT_LOCATION_BRIAN,
    activeLocationId: d.activeLocationId,
    favoriteLocationIds: Array.isArray(d.favoriteLocationIds) ? d.favoriteLocationIds : [],
    activityLogs: Array.isArray(d.activityLogs) ? d.activityLogs.slice(-2000) : [],
  };
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
