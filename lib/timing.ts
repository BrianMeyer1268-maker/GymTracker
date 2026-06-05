import type { Crowd, ExerciseLog, Machine, MovementCategory, TimeBucket, WorkoutGoal, WorkoutSession } from "./types";
import { TIME_BUCKETS } from "./types";
import { DOW_SHORT } from "./date";
import { findMachine } from "./catalog";

export const BUCKET_LABEL: Record<TimeBucket, string> = {
  "early-morning": "Early morning",
  morning: "Morning",
  lunch: "Lunch",
  afternoon: "Afternoon",
  evening: "Evening",
  "late-night": "Late night",
};

export const CROWD_LABEL: Record<Crowd, string> = {
  empty: "Empty",
  light: "Light",
  normal: "Normal",
  busy: "Busy",
  packed: "Packed",
};

export const CROWD_LEVEL: Record<Crowd, number> = { empty: 0, light: 1, normal: 2, busy: 3, packed: 4 };

// Default rest (seconds) by movement. Conditioning = 0 (off unless enabled).
const REST_BY_CATEGORY: Record<MovementCategory, number> = {
  "horizontal-push": 120,
  "vertical-push": 120,
  "horizontal-pull": 120,
  "vertical-pull": 120,
  squat: 120,
  "leg-press": 120,
  hinge: 120,
  "leg-curl": 90,
  "leg-extension": 90,
  lunge: 90,
  "cable-station": 90,
  "chest-isolation": 60,
  triceps: 60,
  "lateral-delts": 60,
  "rear-delts": 60,
  biceps: 60,
  calves: 60,
  core: 60,
  conditioning: 0,
  mobility: 0,
};

export function restDefaultFor(machine: Machine): number {
  return REST_BY_CATEGORY[machine.category] ?? 90;
}

export function sessionDurationMs(s: WorkoutSession): number {
  return s.endedAt && s.endedAt > s.startedAt ? s.endedAt - s.startedAt : 0;
}

export function validSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => s.logCount > 0);
}

export interface Agg {
  count: number;
  avgBusy: number;
  avgSub: number;
  avgDurMin: number;
  avgCrowd: number; // -1 if no crowd data
}

function aggregate(sessions: WorkoutSession[]): Agg {
  const n = sessions.length;
  if (!n) return { count: 0, avgBusy: 0, avgSub: 0, avgDurMin: 0, avgCrowd: -1 };
  const sum = (f: (s: WorkoutSession) => number) => sessions.reduce((a, s) => a + f(s), 0);
  const crowd = sessions.filter((s) => s.crowd).map((s) => CROWD_LEVEL[s.crowd as Crowd]);
  return {
    count: n,
    avgBusy: round1(sum((s) => s.busyCount) / n),
    avgSub: round1(sum((s) => s.subCount) / n),
    avgDurMin: round1(sum((s) => sessionDurationMs(s)) / n / 60000),
    avgCrowd: crowd.length ? round1(crowd.reduce((a, b) => a + b, 0) / crowd.length) : -1,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export interface BucketStat {
  bucket: TimeBucket;
  agg: Agg;
}

export function bucketStats(sessions: WorkoutSession[]): BucketStat[] {
  const valid = validSessions(sessions);
  return TIME_BUCKETS.map((bucket) => ({ bucket, agg: aggregate(valid.filter((s) => s.bucket === bucket)) })).filter((b) => b.agg.count > 0);
}

export interface ComboStat {
  dayOfWeek: number;
  bucket: TimeBucket;
  agg: Agg;
  label: string; // "Tue Lunch"
}

export function comboStats(sessions: WorkoutSession[]): ComboStat[] {
  const valid = validSessions(sessions);
  const map = new Map<string, WorkoutSession[]>();
  for (const s of valid) {
    const key = `${s.dayOfWeek}-${s.bucket}`;
    (map.get(key) ?? map.set(key, []).get(key)!).push(s);
  }
  const out: ComboStat[] = [];
  for (const [key, arr] of map) {
    const [dow, bucket] = key.split("-") as [string, TimeBucket];
    out.push({ dayOfWeek: Number(dow), bucket, agg: aggregate(arr), label: `${DOW_SHORT[Number(dow)]} ${BUCKET_LABEL[bucket].toLowerCase()}` });
  }
  return out;
}

function minBy<T>(arr: T[], f: (x: T) => number): T | undefined {
  return arr.reduce<T | undefined>((best, x) => (best === undefined || f(x) < f(best) ? x : best), undefined);
}
function maxBy<T>(arr: T[], f: (x: T) => number): T | undefined {
  return arr.reduce<T | undefined>((best, x) => (best === undefined || f(x) > f(best) ? x : best), undefined);
}

export interface ScheduleSuggestion {
  enough: boolean;
  totalSessions: number;
  easiest?: ComboStat;
  busiest?: ComboStat;
  fastest?: ComboStat;
  mostFrequent?: ComboStat;
}

export function scheduleSuggestion(sessions: WorkoutSession[]): ScheduleSuggestion {
  const valid = validSessions(sessions);
  if (valid.length < 2) return { enough: false, totalSessions: valid.length };
  const combos = comboStats(valid);
  return {
    enough: true,
    totalSessions: valid.length,
    easiest: minBy(combos, (c) => c.agg.avgBusy),
    busiest: maxBy(combos, (c) => c.agg.avgBusy),
    fastest: minBy(combos.filter((c) => c.agg.avgDurMin > 0), (c) => c.agg.avgDurMin),
    mostFrequent: maxBy(combos, (c) => c.agg.count),
  };
}

// ---------- Rest insights ----------

export interface RestStat {
  machine: Machine;
  avgRest: number; // seconds
  samples: number;
}

export function restByExercise(logs: ExerciseLog[], machines: Machine[]): RestStat[] {
  const byMachine = new Map<string, number[]>();
  for (const l of logs) {
    if (!l.machineId || !l.restsSec || l.restsSec.length === 0) continue;
    const arr = byMachine.get(l.machineId) ?? byMachine.set(l.machineId, []).get(l.machineId)!;
    arr.push(...l.restsSec);
  }
  const out: RestStat[] = [];
  for (const [id, rests] of byMachine) {
    const machine = findMachine(machines, id);
    if (!machine || rests.length === 0) continue;
    out.push({ machine, avgRest: Math.round(rests.reduce((a, b) => a + b, 0) / rests.length), samples: rests.length });
  }
  return out.sort((a, b) => b.samples - a.samples);
}

export function restByGoal(logs: ExerciseLog[]): { goal: WorkoutGoal; avgRest: number }[] {
  const byGoal = new Map<WorkoutGoal, number[]>();
  for (const l of logs) {
    if (!l.restsSec || l.restsSec.length === 0) continue;
    const arr = byGoal.get(l.goal) ?? byGoal.set(l.goal, []).get(l.goal)!;
    arr.push(...l.restsSec);
  }
  return Array.from(byGoal).map(([goal, rests]) => ({ goal, avgRest: Math.round(rests.reduce((a, b) => a + b, 0) / rests.length) }));
}

// ---------- Pace baselines & alerts ----------

export interface PaceBaseline {
  avgActiveMs: number;
  avgPerSetMs: number;
  avgRestSec: number;
  avgSetCount: number;
  avgRepDrop: number;
  samples: number;
}

function repDrop(l: ExerciseLog): number {
  const w = l.sets.filter((r) => r > 0);
  return w.length >= 2 ? w[0] - w[w.length - 1] : 0;
}

/** Per-machine pace baseline from prior logged sessions (needs 2+ timed logs). */
export function paceBaseline(logs: ExerciseLog[], machineId: string | undefined, excludeLogId?: string): PaceBaseline | null {
  if (!machineId) return null;
  const ls = logs.filter((l) => l.machineId === machineId && l.timing && l.id !== excludeLogId);
  if (ls.length < 2) return null;
  const n = ls.length;
  const sum = (f: (l: ExerciseLog) => number) => ls.reduce((a, l) => a + f(l), 0);
  return {
    avgActiveMs: sum((l) => l.timing!.activeMs) / n,
    avgPerSetMs: sum((l) => l.timing!.timePerSetMs) / n,
    avgRestSec: sum((l) => l.timing!.avgRestSec) / n,
    avgSetCount: sum((l) => l.timing!.setCount) / n,
    avgRepDrop: sum(repDrop) / n,
    samples: n,
  };
}

export interface PaceAlerts {
  notes: string[];
  rushing: boolean;
}

/** Gentle pace notes for a just-finished log vs its baseline. Only meaningful diffs (>25%). */
export function paceAlerts(log: ExerciseLog, baseline: PaceBaseline | null): PaceAlerts {
  const notes: string[] = [];
  if (!log.timing || !baseline) return { notes, rushing: false };
  const t = log.timing;
  const fast = baseline.avgActiveMs > 0 && t.activeMs < 0.75 * baseline.avgActiveMs;
  const shortRest = baseline.avgRestSec > 0 && t.avgRestSec > 0 && t.avgRestSec < 0.75 * baseline.avgRestSec;
  const longer = baseline.avgActiveMs > 0 && t.activeMs > 1.33 * baseline.avgActiveMs;
  const bigDrop = repDrop(log) > baseline.avgRepDrop + 1;
  if (fast) notes.push("You moved faster than usual here.");
  if (shortRest) notes.push("Rest was shorter than your normal.");
  if (bigDrop && shortRest) notes.push("Rep drop may be rest-related.");
  if (longer) notes.push("You spent longer than usual — good for form work, but note fatigue.");
  return { notes, rushing: fast && shortRest };
}

function mins(ms: number): number {
  return Math.max(1, Math.round(ms / 60000));
}

export function rushingText(machine: Machine, log: ExerciseLog, baseline: PaceBaseline): string {
  const t = log.timing!;
  return `${machine.name}: ${mins(t.activeMs)} min vs usual ${mins(baseline.avgActiveMs)} min, avg rest ${Math.round(t.avgRestSec)}s vs usual ${Math.round(baseline.avgRestSec)}s. Consider 90–120s next time.`;
}

/** Recent sessions flagged as rushed, newest first. */
export function rushingAlerts(logs: ExerciseLog[], machines: Machine[]): string[] {
  const out: string[] = [];
  const sorted = [...logs].filter((l) => l.timing).sort((a, b) => (b.loggedAt ?? 0) - (a.loggedAt ?? 0));
  for (const l of sorted) {
    const base = paceBaseline(logs, l.machineId, l.id);
    if (base && paceAlerts(l, base).rushing) {
      const m = findMachine(machines, l.machineId);
      if (m) out.push(rushingText(m, l, base));
    }
    if (out.length >= 5) break;
  }
  return out;
}

export interface PaceSummary {
  machine: Machine;
  avgMin: number;
  avgSets: number;
  avgRest: number;
  samples: number;
}

export function paceSummaries(logs: ExerciseLog[], machines: Machine[]): PaceSummary[] {
  const ids = Array.from(new Set(logs.filter((l) => l.timing).map((l) => l.machineId)));
  const out: PaceSummary[] = [];
  for (const id of ids) {
    const base = paceBaseline(logs, id);
    const m = findMachine(machines, id);
    if (!base || !m) continue;
    out.push({ machine: m, avgMin: Math.round((base.avgActiveMs / 60000) * 10) / 10, avgSets: Math.round(base.avgSetCount * 10) / 10, avgRest: Math.round(base.avgRestSec), samples: base.samples });
  }
  return out.sort((a, b) => b.samples - a.samples);
}

/** Heuristic: does short rest correlate with a bigger drop in later-set reps? */
export function restInsights(logs: ExerciseLog[], machines: Machine[]): string[] {
  const byMachine = new Map<string, ExerciseLog[]>();
  for (const l of logs) {
    if (!l.machineId || !l.restsSec || l.restsSec.length === 0) continue;
    const working = l.sets.filter((r) => r > 0);
    if (working.length < 2) continue;
    const arr = byMachine.get(l.machineId) ?? byMachine.set(l.machineId, []).get(l.machineId)!;
    arr.push(l);
  }
  const insights: string[] = [];
  for (const [id, ls] of byMachine) {
    if (ls.length < 2) continue;
    const machine = findMachine(machines, id);
    if (!machine) continue;
    const rows = ls.map((l) => {
      const w = l.sets.filter((r) => r > 0);
      return { avgRest: l.restsSec!.reduce((a, b) => a + b, 0) / l.restsSec!.length, drop: w[0] - w[w.length - 1] };
    });
    const short = rows.filter((r) => r.avgRest < 90);
    const long = rows.filter((r) => r.avgRest >= 90);
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    if (short.length && long.length) {
      const diff = mean(short.map((r) => r.drop)) - mean(long.map((r) => r.drop));
      if (diff >= 1) insights.push(`${machine.name} drops when rest is under 90 sec. Try ${restDefaultFor(machine) || 120} sec.`);
    } else if (short.length >= 2 && mean(short.map((r) => r.drop)) >= 2) {
      insights.push(`${machine.name} fades on short rest. Try ${restDefaultFor(machine) || 120} sec between sets.`);
    }
    if (insights.length >= 5) break;
  }
  return insights;
}
