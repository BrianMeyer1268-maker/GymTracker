import type { ExerciseLog, Machine, Readiness, WorkoutGoal } from "./types";
import { LIFTING_GOALS } from "./types";
import { findMachine } from "./catalog";
import { keyForLog } from "./progression";
import { daysAgo } from "./date";

export type StrengthDirection = "up" | "flat" | "down";

export function logsForMachine(logs: ExerciseLog[], machineId: string): ExerciseLog[] {
  return logs
    .filter((l) => l.machineId === machineId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function lastLogFor(logs: ExerciseLog[], machineId: string): ExerciseLog | undefined {
  const l = logsForMachine(logs, machineId);
  return l[l.length - 1];
}

/** Logs sharing a progression key (exercise-specific on multi-use equipment). */
export function logsForKey(logs: ExerciseLog[], key: string): ExerciseLog[] {
  return logs.filter((l) => keyForLog(l) === key).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function lastLogForKey(logs: ExerciseLog[], key: string): ExerciseLog | undefined {
  const l = logsForKey(logs, key);
  return l[l.length - 1];
}

export function logsOnDate(logs: ExerciseLog[], date: string): ExerciseLog[] {
  return logs.filter((l) => l.date === date);
}

export function bestReps(sets: number[]): number {
  const w = sets.filter((r) => r > 0);
  return w.length ? Math.max(...w) : 0;
}

/** A score for comparing two sessions of the same machine. */
export function sessionScore(machine: Machine, log: ExerciseLog): number {
  const best = bestReps(log.sets);
  if (machine.inverted) return best - log.weight; // less assist + more reps = better
  if (machine.progression === "cardio" || machine.progression === "bodyweight") return best || log.weight;
  return log.weight * (1 + best / 30); // est top-set 1RM
}

/** Like sessionScore but tolerates a missing machine (free-weight / bodyweight logs). */
function scoreLog(machine: Machine | undefined, log: ExerciseLog): number {
  const best = bestReps(log.sets);
  if (machine?.inverted) return best - log.weight;
  if (machine && (machine.progression === "cardio" || machine.progression === "bodyweight")) return best || log.weight;
  return log.weight * (1 + best / 30);
}

export type TrendStatus = "improving" | "stable" | "declining" | "new";

/** One progression line per exercise (keyed by progressionKey, not just the machine). */
export interface TrendItem {
  key: string;
  label: string;
  machine?: Machine;
  last: ExerciseLog;
  prev?: ExerciseLog;
  status: TrendStatus;
}

export function exerciseTrends(logs: ExerciseLog[], machines: Machine[]): TrendItem[] {
  const keys = Array.from(new Set(logs.map(keyForLog).filter(Boolean)));
  const out: TrendItem[] = [];
  for (const key of keys) {
    const sessions = logsForKey(logs, key);
    if (!sessions.length) continue;
    const last = sessions[sessions.length - 1];
    const machine = last.machineId ? findMachine(machines, last.machineId) : undefined;
    const label = last.exerciseName || machine?.name || key;
    if (sessions.length < 2) {
      out.push({ key, label, machine, last, status: "new" });
      continue;
    }
    const prev = sessions[sessions.length - 2];
    const s1 = scoreLog(machine, last);
    const s0 = scoreLog(machine, prev);
    out.push({ key, label, machine, last, prev, status: s1 > s0 ? "improving" : s1 < s0 ? "declining" : "stable" });
  }
  return out;
}

export function improvingExercises(logs: ExerciseLog[], machines: Machine[]): TrendItem[] {
  return exerciseTrends(logs, machines).filter((t) => t.status === "improving");
}

export function stalledExercises(logs: ExerciseLog[], machines: Machine[]): TrendItem[] {
  return exerciseTrends(logs, machines).filter((t) => t.status === "stable" || t.status === "declining");
}

export function newBaselineExercises(logs: ExerciseLog[], machines: Machine[]): TrendItem[] {
  return exerciseTrends(logs, machines).filter((t) => t.status === "new");
}

export function lastWorkoutByGoal(logs: ExerciseLog[]): Record<WorkoutGoal, string | undefined> {
  const out = {} as Record<WorkoutGoal, string | undefined>;
  for (const l of logs) {
    if (!out[l.goal] || l.date > (out[l.goal] as string)) out[l.goal] = l.date;
  }
  return out;
}

export function lastWorkoutDate(logs: ExerciseLog[]): string | undefined {
  return logs.reduce<string | undefined>((acc, l) => (!acc || l.date > acc ? l.date : acc), undefined);
}

/** Distinct training days within the last 7 days (today inclusive). */
export function weeklyCount(logs: ExerciseLog[]): number {
  const days = new Set<string>();
  for (const l of logs) {
    const n = daysAgo(l.date);
    if (n >= 0 && n < 7) days.add(l.date);
  }
  return days.size;
}

export function totalSessions(logs: ExerciseLog[]): number {
  return new Set(logs.map((l) => l.date)).size;
}

export function overallStrength(logs: ExerciseLog[], machines: Machine[]): StrengthDirection {
  const t = exerciseTrends(logs, machines).filter((x) => x.status !== "new");
  if (t.length === 0) return "flat";
  const up = t.filter((x) => x.status === "improving").length;
  const down = t.filter((x) => x.status === "declining").length;
  if (up > down) return "up";
  if (down > up) return "down";
  return "flat";
}

/** Best (heaviest) weight ever logged on a machine. */
export function bestWeightFor(logs: ExerciseLog[], machineId: string): number | undefined {
  const w = logsForMachine(logs, machineId).map((l) => l.weight);
  return w.length ? Math.max(...w) : undefined;
}

/** Highest session score on a machine strictly before `beforeDate`. */
export function priorBestScore(machine: Machine, logs: ExerciseLog[], beforeDate: string): number {
  const scores = logsForMachine(logs, machine.id)
    .filter((l) => l.date < beforeDate)
    .map((l) => sessionScore(machine, l));
  return scores.length ? Math.max(...scores) : -Infinity;
}

/** Suggest today's goal: recovery if beat-up, otherwise the least-recently-trained lift. */
export function suggestGoal(logs: ExerciseLog[], readiness: Readiness | undefined): WorkoutGoal {
  if (readiness === "beat-up") return "recovery";
  const last = lastWorkoutByGoal(logs);
  let best: WorkoutGoal = "push";
  let bestAge = -1;
  for (const g of LIFTING_GOALS) {
    const age = last[g] ? daysAgo(last[g] as string) : Infinity;
    if (age > bestAge) {
      bestAge = age;
      best = g;
    }
  }
  return best;
}
