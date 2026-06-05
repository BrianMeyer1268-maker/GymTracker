import type { Machine, MovementCategory } from "./types";
import { CATEGORY_GROUP, type CatalogGroup } from "./movement";
import { exercisesByGroup } from "./exercises";

// Manufacturer-photo placeholder (local, not copyrighted artwork) per group.
function photoFor(c: MovementCategory): string {
  if (c === "hinge") return "/machines/matrix/hinge.svg";
  const g = CATEGORY_GROUP[c];
  const file = g === "cardio" ? "cardio" : g === "core" ? "push" : g;
  return `/machines/matrix/${file}.svg`;
}

function mm(
  id: string,
  name: string,
  model: string,
  category: MovementCategory,
  equipment: Machine["equipment"],
  progression: Machine["progression"],
  repTarget: [number, number],
  startingWeight: number,
  primaryMuscles: string[],
  secondaryMuscles?: string[],
): Machine {
  return {
    id,
    name,
    brand: "Matrix",
    model: model || undefined,
    category,
    equipment,
    progression,
    repTarget,
    startingWeight,
    primaryMuscles,
    secondaryMuscles,
    manufacturerPhoto: photoFor(category),
    photoSource: "matrix",
  };
}

// Seeded from the Johnson Fitness / Matrix line-up. Names, categories and loads
// are best-guess defaults — all editable in-app, and meant to be re-photographed
// with the user's actual gym machines over time.
export const SEED_MACHINES: Machine[] = [
  // ---------- PUSH ----------
  mm("matrix-versa-chest-press", "Versa Converging Chest Press", "Versa", "horizontal-push", "machine", "machine", [8, 12], 90, ["Chest", "Triceps", "Front delts"]),
  mm("matrix-magnum-supine-bench", "Magnum Supine Bench Press", "Magnum", "horizontal-push", "machine", "machine", [6, 10], 90, ["Chest", "Triceps"]),
  mm("matrix-magnum-incline-bench", "Magnum Incline Bench Press", "Magnum", "horizontal-push", "machine", "machine", [8, 12], 70, ["Upper chest", "Front delts"]),
  mm("matrix-magnum-shoulder-press", "Magnum Shoulder Press", "Magnum", "vertical-push", "machine", "machine", [8, 12], 60, ["Front delts", "Triceps"]),
  mm("matrix-versa-triceps-press", "Versa Triceps Press", "Versa", "triceps", "machine", "cable", [10, 15], 60, ["Triceps"]),
  mm("matrix-versa-pec-fly", "Versa Pec Fly / Rear Delt", "Versa", "chest-isolation", "machine", "cable", [10, 15], 70, ["Chest"], ["Rear delts"]),
  mm("matrix-magnum-smith", "Magnum Smith Machine", "Magnum", "horizontal-push", "smith", "smith", [6, 10], 45, ["Chest", "Full body"]),
  mm("matrix-varsity-smith", "Varsity Smith Machine", "Varsity", "horizontal-push", "smith", "smith", [6, 10], 45, ["Chest", "Full body"]),
  mm("matrix-aura-incline-bench", "Aura Olympic Incline Bench", "Aura", "horizontal-push", "barbell", "barbell", [6, 10], 45, ["Upper chest", "Triceps"]),
  mm("matrix-magnum-flat-bench", "Magnum Olympic Flat Bench", "Magnum", "horizontal-push", "barbell", "barbell", [5, 8], 45, ["Chest", "Triceps"]),
  mm("matrix-magnum-multi-bench", "Magnum Multi-Adjustable Bench", "Magnum", "horizontal-push", "dumbbell", "dumbbell", [8, 12], 40, ["Chest", "Front delts"]),

  // ---------- PULL ----------
  mm("matrix-versa-lat-row", "Versa Lat Pulldown / Seated Row", "Versa", "vertical-pull", "machine", "cable", [8, 12], 100, ["Lats", "Biceps"]),
  mm("matrix-magnum-seated-row", "Magnum Seated Row", "Magnum", "horizontal-pull", "machine", "machine", [8, 12], 90, ["Mid back", "Lats"]),
  mm("matrix-versa-diverging-row", "Versa Diverging Seated Row", "Versa", "horizontal-pull", "machine", "machine", [8, 12], 90, ["Mid back", "Lats"]),
  mm("matrix-versa-bicep-curl", "Versa Bicep Curl", "Versa", "biceps", "machine", "cable", [10, 15], 40, ["Biceps"]),
  mm("matrix-magnum-preacher-curl", "Magnum Preacher Curl", "Magnum", "biceps", "machine", "cable", [10, 15], 40, ["Biceps"]),
  mm("matrix-magnum-vkr-chin", "Magnum VKR w/ Chin", "Magnum", "vertical-pull", "bodyweight", "bodyweight", [5, 12], 0, ["Lats", "Core"]),
  mm("matrix-magnum-crossover", "Magnum Adjustable Crossover", "Magnum", "cable-station", "cable", "cable", [10, 15], 30, ["Back", "Chest", "Arms"]),
  mm("matrix-aura-ft-300", "Aura Functional Trainer 300", "Aura", "cable-station", "cable", "cable", [10, 15], 30, ["Full body"]),
  mm("matrix-aura-ft-400", "Aura Functional Trainer 400", "Aura", "cable-station", "cable", "cable", [10, 15], 30, ["Full body"]),
  mm("matrix-versa-ft", "Versa Functional Trainer", "Versa", "cable-station", "cable", "cable", [10, 15], 30, ["Full body"]),

  // ---------- LEGS ----------
  mm("matrix-magnum-leg-press", "Magnum 45° Leg Press", "Magnum", "leg-press", "machine", "machine", [8, 12], 180, ["Quads", "Glutes"]),
  mm("matrix-versa-leg-press", "Versa Leg Press / Calf Press", "Versa", "leg-press", "machine", "machine", [10, 15], 160, ["Quads", "Calves"]),
  mm("matrix-magnum-hack-squat", "Magnum Hack Squat", "Magnum", "squat", "machine", "machine", [6, 10], 90, ["Quads", "Glutes"]),
  mm("matrix-varsity-perfect-squat", "Varsity Perfect Squat", "Varsity", "squat", "machine", "machine", [8, 12], 90, ["Quads", "Glutes"]),
  mm("matrix-magnum-squat-lunge", "Magnum Squat / Lunge", "Magnum", "squat", "machine", "machine", [8, 12], 90, ["Quads", "Glutes"]),
  mm("matrix-versa-seated-leg-curl", "Versa Seated Leg Curl", "Versa", "leg-curl", "machine", "machine", [10, 15], 70, ["Hamstrings"]),
  mm("matrix-versa-leg-extension", "Versa Leg Extension", "Versa", "leg-extension", "machine", "machine", [10, 15], 70, ["Quads"]),
  mm("matrix-versa-medical-ext-curl", "Versa Medical Leg Ext / Curl", "Versa", "leg-extension", "machine", "machine", [10, 15], 70, ["Quads", "Hamstrings"]),
  mm("matrix-varsity-prone-leg-curl", "Varsity Prone Leg Curl", "Varsity", "leg-curl", "machine", "machine", [10, 15], 60, ["Hamstrings"]),
  mm("matrix-magnum-glute-trainer", "Magnum Glute Trainer", "Magnum", "hinge", "machine", "machine", [10, 15], 90, ["Glutes", "Hamstrings"]),

  // ---------- HINGE ----------
  mm("matrix-back-extension", "Back Extension Bench", "", "hinge", "bodyweight", "bodyweight", [10, 20], 0, ["Lower back", "Glutes"]),
  mm("matrix-glute-ham", "Glute Ham Bench", "", "hinge", "bodyweight", "bodyweight", [8, 15], 0, ["Hamstrings", "Glutes"]),
  mm("matrix-reverse-back-extension", "Reverse Back Extension", "", "hinge", "machine", "machine", [10, 20], 0, ["Lower back", "Glutes"]),

  // ---------- CONDITIONING ----------
  mm("matrix-treadmill", "Treadmill", "", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Legs"]),
  mm("matrix-s-drive", "S-Drive Treadmill", "S-Drive", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Power"]),
  mm("matrix-cxc-cycle", "CXC Indoor Cycle", "CXC", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Legs"]),
  mm("matrix-upright-cycle", "Upright Cycle", "", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Legs"]),
  mm("matrix-total-body-cycle", "Total Body Cycle", "", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Full body"]),
  mm("matrix-upper-body-cycle", "Upper Body Cycle", "", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Arms"]),
  mm("matrix-climbmill", "ClimbMill", "", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Legs"]),
  mm("matrix-elliptical", "Elliptical", "", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Full body"]),
  mm("matrix-rower", "Rower", "", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Back"]),
  mm("matrix-s-force", "S-Force Performance Trainer", "S-Force", "conditioning", "cardio", "cardio", [0, 0], 0, ["Heart", "Power"]),
];

// Pre-marked for first real use: the user's go-to machines (favorite + trainer-guided)
// and a couple of favorite cardio pieces. All editable in-app.
const FAV_TRAINER = new Set<string>([
  "matrix-versa-chest-press", "matrix-magnum-shoulder-press", "matrix-versa-pec-fly", "matrix-versa-triceps-press",
  "matrix-versa-lat-row", "matrix-magnum-seated-row", "matrix-versa-diverging-row", "matrix-magnum-preacher-curl", "matrix-magnum-vkr-chin",
  "matrix-magnum-leg-press", "matrix-versa-seated-leg-curl", "matrix-versa-leg-extension", "matrix-magnum-hack-squat", "matrix-magnum-glute-trainer",
]);
const FAV_ONLY = new Set<string>(["matrix-elliptical", "matrix-cxc-cycle", "matrix-rower"]);
for (const machine of SEED_MACHINES) {
  if (FAV_TRAINER.has(machine.id)) {
    machine.rating = "favorite";
    machine.trainer = true;
  } else if (FAV_ONLY.has(machine.id)) {
    machine.rating = "favorite";
  }
}

// All-in-one cable stations (functional trainers, crossover) support a whole group
// of exercises — rows, face pulls, triceps, etc. Seed them so they're usable at once.
const CABLE_EXERCISES = exercisesByGroup("cable").map((e) => e.id);
for (const machine of SEED_MACHINES) {
  if (machine.category === "cable-station") machine.exercises = [...CABLE_EXERCISES];
}

// Reference images cropped from the Matrix Strength Brochure 2021 (private/local
// app assets — see public/catalog/matrix/LICENSE.txt). Real gym photos take priority.
const CATALOG_PAGES: Record<string, number> = {
  "matrix-versa-chest-press": 24,
  "matrix-versa-pec-fly": 25,
  "matrix-magnum-shoulder-press": 25,
  "matrix-versa-lat-row": 26,
  "matrix-versa-diverging-row": 26,
  "matrix-versa-bicep-curl": 42,
  "matrix-versa-triceps-press": 42,
  "matrix-versa-leg-press": 44,
  "matrix-versa-leg-extension": 44,
  "matrix-versa-seated-leg-curl": 45,
  "matrix-magnum-glute-trainer": 45,
  "matrix-versa-ft": 55,
  "matrix-aura-ft-300": 55,
  "matrix-aura-ft-400": 55,
  "matrix-magnum-crossover": 77,
  "matrix-magnum-flat-bench": 97,
  "matrix-aura-incline-bench": 97,
};
for (const machine of SEED_MACHINES) {
  const page = CATALOG_PAGES[machine.id];
  if (page) {
    machine.catalogPhoto = `/catalog/matrix/${machine.id}.webp`;
    machine.catalogPage = page;
    machine.catalogSource = "matrix-strength-brochure-2021";
  }
}

// Rough default placement at Fitness1440 (editable in "Map My Gym"). Gives every
// machine a starting zone so the locator + active-workout location work day one.
for (const machine of SEED_MACHINES) {
  machine.floorId = "f1440-main";
  machine.zoneId =
    machine.category === "cable-station"
      ? "f1440-cables"
      : machine.equipment === "barbell" || machine.equipment === "smith"
        ? "f1440-free"
        : CATEGORY_GROUP[machine.category] === "cardio"
          ? "f1440-cardio"
          : "f1440-machines";
}

export function activeMachines(machines: Machine[]): Machine[] {
  return machines.filter((m) => !m.archived);
}

export function findMachine(machines: Machine[], id: string | undefined): Machine | undefined {
  return id ? machines.find((m) => m.id === id) : undefined;
}

/** An all-in-one station (cable / functional trainer) that hosts many exercises. */
export function isMultiExercise(m: Machine): boolean {
  return (m.exercises?.length ?? 0) > 0 || m.category === "cable-station";
}

export function machinesInCategory(machines: Machine[], category: MovementCategory): Machine[] {
  return activeMachines(machines).filter((m) => m.category === category);
}

export function machinesInCategories(machines: Machine[], cats: MovementCategory[]): Machine[] {
  return activeMachines(machines).filter((m) => cats.includes(m.category));
}

export function machinesInGroup(machines: Machine[], group: CatalogGroup): Machine[] {
  return activeMachines(machines).filter((m) => CATEGORY_GROUP[m.category] === group);
}

export function machinesNeedingNames(machines: Machine[]): Machine[] {
  return activeMachines(machines).filter((m) => m.needsNaming);
}

export function hasGymPhoto(machine: Machine): boolean {
  return !!machine.gymPhotoId;
}

// ---- Catalog views (Machines tab) ----
export type CatalogView = "all" | "push" | "pull" | "legs" | "hinge" | "conditioning" | "needs-photo" | "needs-naming" | "favorites" | "trainer";

const VIEW_CATS: Partial<Record<CatalogView, MovementCategory[]>> = {
  push: ["horizontal-push", "vertical-push", "chest-isolation", "triceps", "lateral-delts"],
  pull: ["horizontal-pull", "vertical-pull", "rear-delts", "biceps", "cable-station"],
  legs: ["squat", "leg-press", "leg-curl", "leg-extension", "lunge", "calves"],
  hinge: ["hinge"],
  conditioning: ["conditioning", "mobility"],
};

export function machinesForView(machines: Machine[], view: CatalogView): Machine[] {
  const act = activeMachines(machines);
  switch (view) {
    case "all":
      return act;
    case "needs-naming":
      return act.filter((m) => m.needsNaming);
    case "needs-photo":
      return act.filter((m) => !m.gymPhotoId);
    case "favorites":
      return act.filter((m) => m.rating === "favorite");
    case "trainer":
      return act.filter((m) => m.trainer);
    default: {
      const cats = VIEW_CATS[view];
      return cats ? act.filter((m) => cats.includes(m.category)) : act;
    }
  }
}

export function isCardio(machine: Machine): boolean {
  return machine.equipment === "cardio" || machine.category === "conditioning" || machine.category === "mobility";
}
