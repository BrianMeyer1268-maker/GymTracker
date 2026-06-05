import type { EquipmentType, MovementCategory, Phase, Readiness, WorkoutGoal } from "./types";

export const EQUIPMENT_LABEL: Record<EquipmentType, string> = {
  machine: "Machine",
  cable: "Cable",
  dumbbell: "Dumbbell",
  barbell: "Barbell",
  smith: "Smith",
  bodyweight: "Bodyweight",
  cardio: "Cardio",
};

// Emoji used for fallback tiles when a machine has no photo yet.
export const CATEGORY_ICON: Record<MovementCategory, string> = {
  "horizontal-push": "🤜",
  "vertical-push": "🙆",
  "chest-isolation": "🦋",
  triceps: "🔱",
  "lateral-delts": "🔺",
  "horizontal-pull": "🚣",
  "vertical-pull": "🧗",
  "rear-delts": "🔙",
  biceps: "💪",
  "cable-station": "🎛️",
  squat: "🏋️",
  "leg-press": "🦿",
  hinge: "🌉",
  "leg-curl": "🦵",
  "leg-extension": "🦵",
  lunge: "🚶",
  calves: "🦶",
  core: "🎯",
  conditioning: "🔥",
  mobility: "🧘",
};

export const PHASE_LABEL: Record<Phase, string> = {
  "fat-loss": "Fat Loss",
  recomp: "Recomposition",
  maintenance: "Maintenance",
  strength: "Strength Focus",
};

export const PHASE_HINT: Record<Phase, string> = {
  "fat-loss": "Higher reps, conditioning finishers, hold strength.",
  recomp: "Moderate reps, progress lifts, lean out slowly.",
  maintenance: "Keep loads steady, train for upkeep.",
  strength: "Lower reps, heavier, drive the main lifts.",
};

export const READINESS_LABEL: Record<Readiness, string> = {
  great: "Great",
  normal: "Normal",
  tired: "Tired",
  "beat-up": "Beat Up",
};

export const GOAL_LABEL: Record<WorkoutGoal, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  "full-body": "Full Body",
  conditioning: "Conditioning",
  recovery: "Recovery",
};

export const GOAL_ICON: Record<WorkoutGoal, string> = {
  push: "🤜",
  pull: "🤛",
  legs: "🦵",
  "full-body": "🦾",
  conditioning: "🔥",
  recovery: "🧘",
};

// Tailwind color token name per goal (see tailwind.config).
export const GOAL_ACCENT: Record<WorkoutGoal, string> = {
  push: "push",
  pull: "pull",
  legs: "legs",
  "full-body": "full",
  conditioning: "cond",
  recovery: "recovery",
};

export const CATEGORY_LABEL: Record<MovementCategory, string> = {
  "horizontal-push": "Horizontal Push",
  "vertical-push": "Vertical Push",
  "chest-isolation": "Chest Isolation",
  triceps: "Triceps",
  "lateral-delts": "Lateral Delts",
  "horizontal-pull": "Horizontal Pull",
  "vertical-pull": "Vertical Pull",
  "rear-delts": "Rear Delts",
  biceps: "Biceps",
  "cable-station": "Cable Station / Multi-use",
  squat: "Squat / Quad",
  "leg-press": "Leg Press",
  hinge: "Hinge",
  "leg-curl": "Leg Curl",
  "leg-extension": "Leg Extension",
  lunge: "Lunge / Split Squat",
  calves: "Calves",
  core: "Core",
  conditioning: "Conditioning",
  mobility: "Mobility",
};

export type CatalogGroup = "push" | "pull" | "legs" | "cardio" | "core";

export const CATEGORY_GROUP: Record<MovementCategory, CatalogGroup> = {
  "horizontal-push": "push",
  "vertical-push": "push",
  "chest-isolation": "push",
  triceps: "push",
  "lateral-delts": "push",
  "horizontal-pull": "pull",
  "vertical-pull": "pull",
  "rear-delts": "pull",
  biceps: "pull",
  "cable-station": "pull",
  squat: "legs",
  "leg-press": "legs",
  hinge: "legs",
  "leg-curl": "legs",
  "leg-extension": "legs",
  lunge: "legs",
  calves: "legs",
  core: "core",
  conditioning: "cardio",
  mobility: "cardio",
};

export type SlotRole = "primary" | "secondary" | "accessory" | "finisher";

export interface TemplateSlot {
  role: SlotRole;
  label: string;
  /** Acceptable categories in priority order (first is the ideal). */
  categories: MovementCategory[];
  /** Optional slots don't block "workout complete". */
  optional?: boolean;
}

// Ordered movement plan per goal. The navigator walks these slots in order.
export const GOAL_TEMPLATE: Record<WorkoutGoal, TemplateSlot[]> = {
  push: [
    { role: "primary", label: "Horizontal Push", categories: ["horizontal-push"] },
    { role: "secondary", label: "Vertical Push", categories: ["vertical-push"] },
    { role: "accessory", label: "Chest Isolation", categories: ["chest-isolation"] },
    { role: "accessory", label: "Triceps", categories: ["triceps"] },
    { role: "accessory", label: "Lateral Delts", categories: ["lateral-delts"] },
  ],
  pull: [
    { role: "primary", label: "Vertical Pull", categories: ["vertical-pull", "horizontal-pull"] },
    { role: "secondary", label: "Horizontal Pull", categories: ["horizontal-pull", "vertical-pull"] },
    { role: "accessory", label: "Rear Delts", categories: ["rear-delts"] },
    { role: "accessory", label: "Biceps", categories: ["biceps"] },
  ],
  legs: [
    { role: "primary", label: "Knee Dominant", categories: ["squat", "leg-press", "leg-extension"] },
    { role: "secondary", label: "Hamstring Curl", categories: ["leg-curl"] },
    { role: "accessory", label: "Hinge / Posterior Chain", categories: ["hinge"] },
    { role: "accessory", label: "Calves", categories: ["calves"] },
    { role: "finisher", label: "Conditioning Finisher", categories: ["conditioning"], optional: true },
  ],
  "full-body": [
    { role: "primary", label: "Push", categories: ["horizontal-push", "vertical-push", "chest-isolation"] },
    { role: "primary", label: "Pull", categories: ["horizontal-pull", "vertical-pull"] },
    { role: "primary", label: "Legs", categories: ["squat", "leg-press", "leg-extension"] },
    { role: "secondary", label: "Hinge / Posterior", categories: ["hinge", "leg-curl"] },
    { role: "accessory", label: "Arms / Shoulders", categories: ["biceps", "triceps", "lateral-delts", "rear-delts"], optional: true },
    { role: "finisher", label: "Cardio Finisher", categories: ["conditioning"], optional: true },
  ],
  conditioning: [
    { role: "primary", label: "Conditioning", categories: ["conditioning"] },
    { role: "secondary", label: "Conditioning", categories: ["conditioning"], optional: true },
  ],
  recovery: [
    { role: "primary", label: "Easy Movement", categories: ["conditioning", "mobility"] },
    { role: "secondary", label: "Mobility", categories: ["mobility"], optional: true },
  ],
};

const FINISHER: TemplateSlot = { role: "finisher", label: "Conditioning Finisher", categories: ["conditioning"], optional: true };

// Goals that get a fat-loss conditioning finisher appended (others already have one).
const FINISHER_GOALS: WorkoutGoal[] = ["push", "pull"];

/** Build the slot list for today, trimmed by readiness and extended by phase. */
export function effectiveTemplate(goal: WorkoutGoal, readiness: Readiness, phase: Phase): TemplateSlot[] {
  let slots = GOAL_TEMPLATE[goal].slice();
  if (readiness === "tired") slots = slots.slice(0, Math.max(2, slots.length - 1));
  if (readiness === "beat-up") slots = slots.slice(0, Math.min(2, slots.length));
  if (phase === "fat-loss" && FINISHER_GOALS.includes(goal)) slots = [...slots, FINISHER];
  return slots;
}

// Equivalent movements when the planned machine is busy. Self is listed first.
export const SUBSTITUTES: Record<MovementCategory, MovementCategory[]> = {
  "horizontal-push": ["horizontal-push", "vertical-push", "chest-isolation"],
  "vertical-push": ["vertical-push", "horizontal-push", "lateral-delts"],
  "chest-isolation": ["chest-isolation", "horizontal-push", "cable-station"],
  triceps: ["triceps", "horizontal-push", "cable-station"],
  "lateral-delts": ["lateral-delts", "vertical-push", "cable-station"],
  "horizontal-pull": ["horizontal-pull", "vertical-pull", "rear-delts", "cable-station"],
  "vertical-pull": ["vertical-pull", "horizontal-pull", "cable-station"],
  "rear-delts": ["rear-delts", "horizontal-pull", "cable-station"],
  biceps: ["biceps", "vertical-pull", "cable-station"],
  "cable-station": ["cable-station", "horizontal-pull", "triceps", "biceps", "rear-delts", "chest-isolation", "lateral-delts"],
  squat: ["squat", "leg-press", "lunge"],
  "leg-press": ["leg-press", "squat", "hinge"],
  hinge: ["hinge", "leg-curl", "leg-press"],
  "leg-curl": ["leg-curl", "hinge"],
  "leg-extension": ["leg-extension", "squat", "leg-press"],
  lunge: ["lunge", "squat", "leg-press"],
  calves: ["calves"],
  core: ["core"],
  conditioning: ["conditioning"],
  mobility: ["mobility", "conditioning"],
};
