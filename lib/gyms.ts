import type { GymLocation, GymType, ActivityType, TrackerKind } from "./types";

// ---- Gym type presentation ----
export const GYM_TYPE_LABEL: Record<GymType, string> = {
  machine: "Machine gym",
  mixed: "Mixed gym",
  combat: "Combat / class gym",
  class: "Class gym",
  "free-weight": "Free-weight gym",
  cardio: "Cardio gym",
  home: "Home",
  outdoor: "Outdoors",
};

export const GYM_TYPE_ICON: Record<GymType, string> = {
  machine: "🏋️",
  mixed: "🏟️",
  combat: "🥊",
  class: "🧑‍🤝‍🧑",
  "free-weight": "💪",
  cardio: "🏃",
  home: "🏠",
  outdoor: "🌳",
};

// ---- Activity presentation + routing ----
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  "machine-strength": "Machine Strength",
  "free-weights": "Free Weights",
  bodyweight: "Bodyweight",
  kickboxing: "Kickboxing / Muay Thai",
  boxing: "Boxing",
  bjj: "BJJ / Grappling",
  "strength-conditioning": "Strength & Conditioning",
  run: "Run",
  walk: "Walk",
  bike: "Bike",
  elliptical: "Elliptical",
  recovery: "Recovery / Mobility",
};

export const ACTIVITY_ICON: Record<ActivityType, string> = {
  "machine-strength": "🏋️",
  "free-weights": "💪",
  bodyweight: "🤸",
  kickboxing: "🥊",
  boxing: "🥊",
  bjj: "🥋",
  "strength-conditioning": "⚡",
  run: "🏃",
  walk: "🚶",
  bike: "🚴",
  elliptical: "🏃",
  recovery: "🧘",
};

/** Which logging surface each activity routes to. */
export const ACTIVITY_TRACKER: Record<ActivityType, TrackerKind> = {
  "machine-strength": "machine",
  "free-weights": "free-weight",
  "strength-conditioning": "free-weight",
  bodyweight: "bodyweight",
  kickboxing: "combat",
  boxing: "combat",
  bjj: "combat",
  run: "cardio",
  walk: "cardio",
  bike: "cardio",
  elliptical: "cardio",
  recovery: "recovery",
};

export function trackerFor(activity: ActivityType): TrackerKind {
  return ACTIVITY_TRACKER[activity];
}

/** Machine gyms (and large mixed gyms) make the machine navigator the default. */
export function usesMachineNavigator(type: GymType): boolean {
  return type === "machine" || type === "mixed";
}

// ---- Per-activity option sets (for the tracker forms) ----
export const MOVEMENTS = ["Push", "Pull", "Squat", "Hinge", "Carry", "Core", "Mobility"];
export const EQUIPMENT_OPTS = ["Dumbbells", "Kettlebells", "Barbell", "Bands", "Bodyweight", "Sled/Turf"];
export const BODYWEIGHT_EXERCISES = ["Pushups", "Squats", "Lunges", "Planks", "Bands", "Dumbbells"];
export const RECOVERY_FOCUS = ["Stretching", "Foam roll", "Yoga", "Breathwork", "Easy walk"];

/** Combat focus chips per striking/grappling discipline. */
export const COMBAT_FOCUS: Partial<Record<ActivityType, string[]>> = {
  kickboxing: ["Bag work", "Pad work", "Combinations", "Footwork", "Conditioning"],
  boxing: ["Bag work", "Mitts", "Footwork", "Conditioning"],
  bjj: ["Technique", "Drilling", "Rolling", "Positional work"],
};

/** Cardio sub-types per discipline. */
export const CARDIO_SUBTYPES: Partial<Record<ActivityType, string[]>> = {
  run: ["Easy run", "Intervals", "Tempo", "Walk/Run", "Recovery run"],
  walk: ["Casual", "Brisk", "Recovery walk", "Ruck"],
  bike: ["Easy", "Intervals", "Endurance", "Indoor", "Outdoor"],
  elliptical: ["Easy", "Intervals", "Endurance"],
};

// ---- Seed locations (reusable across all profiles) ----
export const SEED_LOCATIONS: GymLocation[] = [
  {
    id: "fitness1440",
    name: "Fitness1440 Odessa",
    type: "machine",
    activities: ["machine-strength", "free-weights", "elliptical", "recovery"],
    createdFrom: "manual",
    notes: "Machine-based gym — uses the machine navigator.",
    floors: [{ id: "f1440-main", name: "Main floor" }],
    zones: [
      { id: "f1440-machines", floorId: "f1440-main", name: "Selectorized machines", zoneType: "machines", landmark: "Center of the floor" },
      { id: "f1440-cables", floorId: "f1440-main", name: "Cable & functional", zoneType: "cables", landmark: "Along the mirrored wall" },
      { id: "f1440-free", floorId: "f1440-main", name: "Free weights & benches", zoneType: "free-weights", landmark: "Back-right, by the dumbbell rack" },
      { id: "f1440-cardio", floorId: "f1440-main", name: "Cardio", zoneType: "cardio", landmark: "Front, by the windows" },
    ],
  },
  {
    id: "corec",
    name: "Purdue CoRec",
    type: "mixed",
    activities: ["machine-strength", "free-weights", "run", "bike", "elliptical", "recovery"],
    createdFrom: "manual",
    notes: "Large mixed facility — machines, free weights, courts, cardio and classes.",
  },
  {
    id: "impact-zone",
    name: "Impact Zone Training Center",
    type: "combat",
    activities: ["kickboxing", "boxing", "bjj", "strength-conditioning", "free-weights", "recovery"],
    website: "https://www.impactzonetrainingcenter.com/",
    createdFrom: "manual",
    notes: "Class / free-weight / combat gym — kickboxing, boxing, BJJ, S&C, bootcamps, personal training.",
  },
  {
    id: "home",
    name: "Home",
    type: "home",
    activities: ["bodyweight", "free-weights", "recovery", "walk", "run", "bike"],
    createdFrom: "manual",
    notes: "Bodyweight, dumbbells/bands, mobility and easy cardio.",
  },
  {
    id: "outdoors",
    name: "Outdoors",
    type: "outdoor",
    activities: ["run", "walk", "bike"],
    createdFrom: "manual",
    notes: "Run, walk, bike (ruck optional).",
  },
  {
    id: "hotel-gym",
    name: "Hotel Gym",
    type: "cardio",
    activities: ["machine-strength", "free-weights", "elliptical", "run", "recovery"],
    createdFrom: "manual",
    notes: "Simple machine / free-weight / cardio setup while travelling.",
  },
];

export const DEFAULT_LOCATION_BRIAN = "fitness1440";
export const DEFAULT_LOCATION_KAT = "impact-zone";

/** Fresh deep copies of the seed locations (so per-profile edits don't alias). */
export function seedLocations(): GymLocation[] {
  return SEED_LOCATIONS.map((l) => ({ ...l, activities: [...l.activities] }));
}

export function locationById(locations: GymLocation[], id: string | undefined | null): GymLocation | undefined {
  return id ? locations.find((l) => l.id === id) : undefined;
}

export function resolveActiveLocation(locations: GymLocation[], activeId?: string, defaultId?: string): GymLocation | undefined {
  return locationById(locations, activeId) ?? locationById(locations, defaultId) ?? locations[0];
}

/** The activity to default to when a location is opened (machine gyms → navigator). */
export function defaultActivityFor(loc: GymLocation | undefined): ActivityType | undefined {
  if (!loc) return undefined;
  if (usesMachineNavigator(loc.type) && loc.activities.includes("machine-strength")) return "machine-strength";
  return undefined;
}
