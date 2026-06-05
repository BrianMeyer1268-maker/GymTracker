import type { AppData, Machine } from "./types";
import { PHASES } from "./types";
import { seededDefault, freshProfileData, migrate, mergeMachines, restoreSeeds, hasActiveMachine, uid } from "./storage";
import { DEFAULT_LOCATION_KAT } from "./gyms";

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  color: string;
  /** Soft per-profile lock: salted hash of a 4-digit PIN. Absent = no lock. */
  pinHash?: string;
}

/**
 * Lightweight, synchronous salted hash for the per-profile PIN. This is a *soft*
 * privacy lock between trusted co-users sharing a device — not real cryptography
 * (a 4-digit space is brute-forceable). It just keeps the PIN out of plain sight
 * in localStorage so one person can't casually open another's workouts.
 */
export function hashPin(pin: string, salt: string): string {
  let h = 2166136261;
  const s = `${salt}:${pin}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export interface ProfilesState {
  profiles: Profile[];
  activeId: string;
  shareCatalog: boolean;
}

const META_KEY = "ironcompass:profiles";
const ACTIVE_KEY = "ironcompass:active"; // active profile stored separately
const CATALOG_KEY = "ironcompass:catalog"; // shared machine catalog
const V3_KEY = "ironcompass:v3"; // existing single-blob data (Brian)
const V2_KEY = "ironcompass:v2";
const V1_KEY = "gym-tracker:v1";

const PALETTE = ["#38bdf8", "#f472b6", "#34d399", "#fb923c", "#a78bfa", "#facc15"];
const dataKey = (id: string) => `ironcompass:p:${id}`;

function read(key: string): any {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key: string, val: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* quota */
  }
}
function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Build Brian's starting data from existing storage (v3 → v2/v1 fallback). */
function migrateBrianData(): AppData {
  const v3 = read(V3_KEY);
  if (v3) return migrate(v3);
  const seeded = seededDefault();
  const v2 = read(V2_KEY);
  const v1 = read(V1_KEY);
  if (v2) {
    if (PHASES.includes(v2?.phase)) seeded.phase = v2.phase;
    if (Array.isArray(v2?.logs)) seeded.logs = v2.logs;
    if (Array.isArray(v2?.bodyComp) && v2.bodyComp.length) seeded.bodyComp = v2.bodyComp;
    if (Array.isArray(v2?.flagged)) seeded.flagged = v2.flagged;
  } else if (v1 && Array.isArray(v1?.bodyComp) && v1.bodyComp.length) {
    seeded.bodyComp = v1.bodyComp;
  }
  return seeded;
}

/** Ensure the profiles system exists; migrate legacy single-profile data on first run. */
export function ensureProfiles(): ProfilesState {
  const meta = read(META_KEY);
  if (meta && Array.isArray(meta.profiles) && meta.profiles.length) {
    const activeFromKey = read(ACTIVE_KEY)?.id;
    let activeId: string = activeFromKey ?? meta.activeId ?? meta.profiles[0].id;
    if (!meta.profiles.some((p: Profile) => p.id === activeId)) activeId = meta.profiles[0].id;
    return { profiles: meta.profiles, activeId, shareCatalog: meta.shareCatalog !== false };
  }

  // First run with profiles → migrate Brian, seed Kat.
  const brian = migrateBrianData();
  write(CATALOG_KEY, { machines: brian.machines });
  write(dataKey("brian"), { ...brian, machines: [] });
  write(dataKey("kat"), { ...freshProfileData(), machines: [], defaultLocationId: DEFAULT_LOCATION_KAT, activeLocationId: DEFAULT_LOCATION_KAT });
  const profiles: Profile[] = [
    { id: "brian", name: "Brian", createdAt: Date.now(), color: "#38bdf8" },
    { id: "kat", name: "Kat", createdAt: Date.now(), color: "#f472b6" },
  ];
  const state: ProfilesState = { profiles, activeId: "brian", shareCatalog: true };
  persistState(state);
  return state;
}

export function persistState(state: ProfilesState): void {
  write(META_KEY, { profiles: state.profiles, activeId: state.activeId, shareCatalog: state.shareCatalog });
  write(ACTIVE_KEY, { id: state.activeId });
}

/** Load a profile's assembled AppData (machines come from the shared catalog when enabled). */
export function loadProfileData(id: string, shareCatalog: boolean): AppData {
  const blob = read(dataKey(id));
  const base = blob ? migrate(blob) : freshProfileData();
  let machines = base.machines;
  if (shareCatalog) {
    const cat = read(CATALOG_KEY);
    machines = mergeMachines(cat?.machines);
  }
  // Auto-heal: never present an empty catalog — refill the seed machines.
  if (!hasActiveMachine(machines)) machines = restoreSeeds(machines);
  return { ...base, machines };
}

export function saveProfileData(id: string, data: AppData, shareCatalog: boolean): void {
  if (shareCatalog) {
    write(CATALOG_KEY, { machines: data.machines });
    write(dataKey(id), { ...data, machines: [] });
  } else {
    write(dataKey(id), data);
  }
}

export function makeProfile(name: string, used: number): Profile {
  return { id: `prof-${uid()}`, name: name.trim() || "New profile", createdAt: Date.now(), color: PALETTE[used % PALETTE.length] };
}

export function initNewProfileData(id: string, shareCatalog: boolean): void {
  saveProfileData(id, freshProfileData(), shareCatalog);
}

export function deleteProfileData(id: string): void {
  remove(dataKey(id));
}

/** Move machines between shared and per-profile storage when the share toggle changes. */
export function applyShareToggle(state: ProfilesState, next: boolean, activeMachines: Machine[]): void {
  if (next === state.shareCatalog) return;
  if (next) {
    // Turning ON: the active profile's catalog becomes the shared one.
    write(CATALOG_KEY, { machines: activeMachines });
  } else {
    // Turning OFF: copy the shared catalog into every profile's own store.
    const cat = read(CATALOG_KEY);
    const machines = mergeMachines(cat?.machines);
    for (const p of state.profiles) {
      const blob = read(dataKey(p.id));
      const base = blob ? migrate(blob) : freshProfileData();
      write(dataKey(p.id), { ...base, machines });
    }
  }
}
