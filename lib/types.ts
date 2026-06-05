// Iron Compass data model. Client-only, persisted to localStorage.

export type Phase = "fat-loss" | "recomp" | "maintenance" | "strength";
export type Readiness = "great" | "normal" | "tired" | "beat-up";
export type WorkoutGoal = "push" | "pull" | "legs" | "full-body" | "conditioning" | "recovery";
export type Difficulty = "easy" | "right" | "hard";
export type Pain = "none" | "minor" | "significant";

export type TimeBucket = "early-morning" | "morning" | "lunch" | "afternoon" | "evening" | "late-night";
export type Crowd = "empty" | "light" | "normal" | "busy" | "packed";

export type EquipmentType = "machine" | "cable" | "dumbbell" | "barbell" | "smith" | "bodyweight" | "cardio";

// How a movement progresses (drives the load jump).
export type ProgressionRule = "machine" | "cable" | "dumbbell" | "barbell" | "smith" | "bodyweight" | "cardio";

// "Top Machines" rating.
export type MachineRating = "favorite" | "normal" | "avoid";

// How sure we are about a machine (from AI import / manual entry).
export type MachineConfidence = "confirmed" | "likely" | "unknown" | "needs-naming";

export type MovementCategory =
  | "horizontal-push"
  | "vertical-push"
  | "chest-isolation"
  | "triceps"
  | "lateral-delts"
  | "horizontal-pull"
  | "vertical-pull"
  | "rear-delts"
  | "biceps"
  | "cable-station"
  | "squat"
  | "leg-press"
  | "hinge"
  | "leg-curl"
  | "leg-extension"
  | "lunge"
  | "calves"
  | "core"
  | "conditioning"
  | "mobility";

/** Structured setup notes shown on the logger screen. */
export interface MachineSetup {
  seat?: string;
  handle?: string;
  pad?: string;
  start?: string; // starting position note
  formCue?: string;
}

/** A specific machine / exercise at the user's gym (the catalog entry). */
export interface Machine {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  category: MovementCategory;
  equipment: EquipmentType;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  /** Legacy free-text settings note (superseded by `setup`). */
  settingsNotes?: string;
  setup?: MachineSetup;
  startingWeight?: number;
  /** User's usual working weight. */
  usualWeight?: number;
  /** Smallest load jump available on this machine (overrides the rule default). */
  smallestJump?: number;
  progression: ProgressionRule;
  repTarget: [number, number];
  /** Stock/manufacturer image URL or /public path (e.g. /machines/matrix/push.svg). */
  manufacturerPhoto?: string;
  /** Where the manufacturer photo came from (e.g. "matrix"). */
  photoSource?: string;
  /** localStorage key of the user's own gym photo (downscaled). Takes display priority. */
  gymPhotoId?: string;
  /** @deprecated migrated to gymPhotoId */
  photoId?: string;
  notes?: string;
  /** Top-machines rating. Favorites rank higher, "avoid" sinks. */
  rating?: MachineRating;
  /** Detection confidence (AI import). Absent = treated as confirmed. */
  confidence?: MachineConfidence;
  /** Part of trainer-guided workouts — rank higher when available. */
  trainer?: boolean;
  /** Unknown machine awaiting a real name. */
  needsNaming?: boolean;
  archived?: boolean;
  custom?: boolean;
  /** Assisted movements: more weight = easier (e.g. assisted pull-up). */
  inverted?: boolean;
  /** For multi-exercise stations (cable / functional trainer): the exercises this
   *  machine supports — ids from the grouped exercise library (or custom names). */
  exercises?: string[];
}

/** Per-exercise time tracking for pace intelligence. */
export interface LogTiming {
  openedAt: number;
  firstSetAt?: number;
  savedAt: number;
  activeMs: number; // time spent on the machine
  restTotalSec: number;
  setCount: number;
  avgRestSec: number;
  timePerSetMs: number;
}

export interface ExerciseLog {
  id: string;
  date: string; // YYYY-MM-DD (local)
  machineId: string;
  category: MovementCategory;
  goal: WorkoutGoal;
  weight: number;
  sets: number[];
  difficulty: Difficulty;
  pain: Pain;
  loggedAt?: number; // epoch ms when saved
  /** Rest durations (seconds) used during this exercise, in order. */
  restsSec?: number[];
  timing?: LogTiming;
  sessionId?: string;
}

/** One workout session — timing + crowd intelligence. */
export interface WorkoutSession {
  id: string;
  date: string;
  goal: WorkoutGoal;
  startedAt: number; // epoch ms
  endedAt?: number; // epoch ms (rolling = last log; final = end workout)
  dayOfWeek: number; // 0 = Sunday
  bucket: TimeBucket;
  crowd?: Crowd;
  busyCount: number; // machines marked busy
  subCount: number; // substitutions used
  skipCount: number; // movements skipped
  logCount: number; // exercises logged
}

/** A single availability tap, for the gym-traffic dashboard. */
export interface AvailabilityObservation {
  id: string;
  machineId: string;
  action: "available" | "busy" | "became-busy";
  at: number; // epoch ms
  dayOfWeek: number;
  bucket: TimeBucket;
  goal?: WorkoutGoal;
  crowd?: Crowd;
}

export type SwitchReason = "busy" | "became-occupied" | "not-working" | "bad-fit" | "pain" | "substitute" | "skipped";

/** Why the user left / switched away from a machine. */
export interface StationEvent {
  id: string;
  machineId: string;
  reason: SwitchReason;
  at: number;
  dayOfWeek: number;
  bucket: TimeBucket;
  goal?: WorkoutGoal;
  sessionId?: string;
}

export interface BodyCompEntry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  weight: number;
  bodyFat?: number;
  skeletalMuscle?: number;
  visceralFat?: number;
  waist?: number;
  bodyWater?: number; // %
  bmr?: number; // calories
}

/** The live state of today's session — persisted so the app resumes mid-workout. */
export interface DayPlan {
  date: string;
  goal?: WorkoutGoal;
  readiness?: Readiness;
  busy: string[]; // machineIds currently marked busy
  skipped?: number[]; // skipped slot indexes for today
  activeMachineId?: string; // the machine whose logger is open
  sessionId?: string; // the active WorkoutSession
  crowd?: Crowd; // "how crowded is the gym" answer
}

// ---- Locations (gyms) & activities — universal Location + Activity system ----

export type GymType = "machine" | "mixed" | "combat" | "class" | "free-weight" | "cardio" | "home" | "outdoor";

/** How a location/gym profile was created. */
export type LocationSource = "location" | "website" | "image" | "manual" | "ai-import";

/** The 12 trackable activity types. */
export type ActivityType =
  | "machine-strength"
  | "free-weights"
  | "bodyweight"
  | "kickboxing"
  | "boxing"
  | "bjj"
  | "strength-conditioning"
  | "run"
  | "walk"
  | "bike"
  | "elliptical"
  | "recovery";

/** Which logging surface an activity routes to. */
export type TrackerKind = "machine" | "free-weight" | "bodyweight" | "combat" | "cardio" | "recovery";

export type ActivityIntensity = "easy" | "moderate" | "hard" | "brutal";
export type SorenessLevel = "none" | "mild" | "moderate" | "high";

/** A gym / place the user trains at — reusable & shareable across profiles. */
export interface GymLocation {
  id: string;
  name: string;
  nickname?: string;
  address?: string;
  website?: string;
  type: GymType;
  hours?: string;
  activities: ActivityType[];
  equipmentCatalog?: string[];
  /** Optional ids into the shared machine catalog (machine gyms). */
  machineCatalogIds?: string[];
  cardioOptions?: string[];
  freeWeightOptions?: string[];
  classOptions?: string[];
  confidence?: number;
  needsReview?: boolean;
  createdFrom?: LocationSource;
  /** Confirmed gym coordinates only — never an ongoing GPS trail. */
  lat?: number;
  lng?: number;
  notes?: string;
}

/** A logged non-machine session (free-weights / cardio / combat / bodyweight / recovery). */
export interface ActivityLog {
  id: string;
  date: string; // YYYY-MM-DD (local)
  at: number; // epoch ms
  locationId: string;
  locationName: string;
  activity: ActivityType;
  tracker: TrackerKind;
  durationMin?: number;
  intensity?: ActivityIntensity;
  soreness?: SorenessLevel;
  notes?: string;
  heartRate?: number;
  calories?: number;
  // cardio
  distance?: number;
  pace?: string;
  routeNotes?: string;
  // combat / cardio sub-type (e.g. "Easy run", "Intervals")
  subType?: string;
  // combat
  focuses?: string[];
  sparring?: boolean;
  rounds?: number;
  roundLengthMin?: number;
  // strength / free-weight / bodyweight
  movements?: string[];
  equipment?: string[];
  exercises?: string[];
  skillFocus?: string;
}

export interface AppData {
  version: number;
  phase: Phase;
  machines: Machine[];
  logs: ExerciseLog[];
  bodyComp: BodyCompEntry[];
  flagged: string[]; // machineIds flagged for pain
  sessions: WorkoutSession[];
  observations: AvailabilityObservation[];
  switchEvents: StationEvent[];
  today?: DayPlan;
  // Universal Location + Activity system
  locations: GymLocation[];
  defaultLocationId?: string;
  activeLocationId?: string;
  favoriteLocationIds?: string[];
  activityLogs: ActivityLog[];
}

export const PHASES: Phase[] = ["fat-loss", "recomp", "maintenance", "strength"];
export const READINESS_OPTS: Readiness[] = ["great", "normal", "tired", "beat-up"];
export const GOALS: WorkoutGoal[] = ["push", "pull", "legs", "full-body", "conditioning", "recovery"];
export const LIFTING_GOALS: WorkoutGoal[] = ["push", "pull", "legs"];
export const CROWD_OPTS: Crowd[] = ["empty", "light", "normal", "busy", "packed"];
export const TIME_BUCKETS: TimeBucket[] = ["early-morning", "morning", "lunch", "afternoon", "evening", "late-night"];

export const GYM_TYPES: GymType[] = ["machine", "mixed", "combat", "class", "free-weight", "cardio", "home", "outdoor"];
export const ACTIVITY_TYPES: ActivityType[] = [
  "machine-strength",
  "free-weights",
  "bodyweight",
  "kickboxing",
  "boxing",
  "bjj",
  "strength-conditioning",
  "run",
  "walk",
  "bike",
  "elliptical",
  "recovery",
];
export const ACTIVITY_INTENSITIES: ActivityIntensity[] = ["easy", "moderate", "hard", "brutal"];
export const SORENESS_LEVELS: SorenessLevel[] = ["none", "mild", "moderate", "high"];
