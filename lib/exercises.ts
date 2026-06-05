// Equipment-grouped exercise library. Every "system" (free weights, kettlebells,
// an all-in-one cable / functional trainer, bands, bodyweight) holds a group of
// exercises. Used by the free-weight / bodyweight trackers and by multi-exercise
// machines (cable stations) so you pick a real movement, not just "push/pull".

export type ExerciseGroup = "barbell" | "dumbbell" | "kettlebell" | "cable" | "band" | "bodyweight";
export type MovementTag = "push" | "pull" | "legs" | "hinge" | "core" | "carry";

export interface ExerciseDef {
  id: string;
  name: string;
  group: ExerciseGroup;
  movement: MovementTag;
}

export const EXERCISE_GROUPS: { id: ExerciseGroup; name: string; icon: string }[] = [
  { id: "barbell", name: "Barbell", icon: "🏋️" },
  { id: "dumbbell", name: "Dumbbells", icon: "💪" },
  { id: "kettlebell", name: "Kettlebells", icon: "🔔" },
  { id: "cable", name: "Cable / Functional Trainer", icon: "🧵" },
  { id: "band", name: "Bands", icon: "🎗️" },
  { id: "bodyweight", name: "Bodyweight", icon: "🤸" },
];

export const MOVEMENT_TAG_LABEL: Record<MovementTag, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  hinge: "Hinge",
  core: "Core",
  carry: "Carry",
};

function ex(group: ExerciseGroup, name: string, movement: MovementTag): ExerciseDef {
  return { id: `${group}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, name, group, movement };
}

export const EXERCISES: ExerciseDef[] = [
  // ---- Barbell ----
  ex("barbell", "Back Squat", "legs"),
  ex("barbell", "Front Squat", "legs"),
  ex("barbell", "Deadlift", "hinge"),
  ex("barbell", "Romanian Deadlift", "hinge"),
  ex("barbell", "Bench Press", "push"),
  ex("barbell", "Incline Bench Press", "push"),
  ex("barbell", "Overhead Press", "push"),
  ex("barbell", "Barbell Row", "pull"),
  ex("barbell", "Hip Thrust", "hinge"),
  ex("barbell", "Lunge", "legs"),

  // ---- Dumbbells ----
  ex("dumbbell", "Shoulder Press", "push"),
  ex("dumbbell", "Incline Press", "push"),
  ex("dumbbell", "Bench Press", "push"),
  ex("dumbbell", "Lateral Raise", "push"),
  ex("dumbbell", "Rear Delt Fly", "pull"),
  ex("dumbbell", "Bicep Curl", "pull"),
  ex("dumbbell", "Hammer Curl", "pull"),
  ex("dumbbell", "One-arm Row", "pull"),
  ex("dumbbell", "Goblet Squat", "legs"),
  ex("dumbbell", "Walking Lunge", "legs"),
  ex("dumbbell", "Romanian Deadlift", "hinge"),

  // ---- Kettlebells ----
  ex("kettlebell", "Swing", "hinge"),
  ex("kettlebell", "Goblet Squat", "legs"),
  ex("kettlebell", "Press", "push"),
  ex("kettlebell", "Clean", "pull"),
  ex("kettlebell", "Snatch", "pull"),
  ex("kettlebell", "Turkish Get-up", "core"),
  ex("kettlebell", "Row", "pull"),
  ex("kettlebell", "Front Rack Carry", "carry"),
  ex("kettlebell", "Halo", "core"),

  // ---- Cable / Functional Trainer (all-in-one) ----
  ex("cable", "Seated Row", "pull"),
  ex("cable", "Lat Pulldown", "pull"),
  ex("cable", "Face Pull", "pull"),
  ex("cable", "Straight-arm Pulldown", "pull"),
  ex("cable", "Cable Curl", "pull"),
  ex("cable", "Triceps Pushdown", "push"),
  ex("cable", "Chest Fly", "push"),
  ex("cable", "Cable Press", "push"),
  ex("cable", "Lateral Raise", "push"),
  ex("cable", "Cable Kickback", "legs"),
  ex("cable", "Pallof Press", "core"),
  ex("cable", "Woodchop", "core"),

  // ---- Bands ----
  ex("band", "Pull-apart", "pull"),
  ex("band", "Face Pull", "pull"),
  ex("band", "Row", "pull"),
  ex("band", "Bicep Curl", "pull"),
  ex("band", "Overhead Press", "push"),
  ex("band", "Triceps Pushdown", "push"),
  ex("band", "Squat", "legs"),
  ex("band", "Lateral Walk", "legs"),
  ex("band", "Glute Bridge", "hinge"),

  // ---- Bodyweight ----
  ex("bodyweight", "Pushup", "push"),
  ex("bodyweight", "Pike Pushup", "push"),
  ex("bodyweight", "Dip", "push"),
  ex("bodyweight", "Pull-up", "pull"),
  ex("bodyweight", "Chin-up", "pull"),
  ex("bodyweight", "Inverted Row", "pull"),
  ex("bodyweight", "Squat", "legs"),
  ex("bodyweight", "Lunge", "legs"),
  ex("bodyweight", "Glute Bridge", "hinge"),
  ex("bodyweight", "Plank", "core"),
  ex("bodyweight", "Hollow Hold", "core"),
  ex("bodyweight", "Mountain Climber", "core"),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id: string): ExerciseDef | undefined {
  return BY_ID.get(id);
}

export function exercisesByGroup(group: ExerciseGroup): ExerciseDef[] {
  return EXERCISES.filter((e) => e.group === group);
}

export function exerciseName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}
