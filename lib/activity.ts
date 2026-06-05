import type { ActivityLog, ActivityIntensity, SorenessLevel, TrackerKind, GymLocation, WorkoutSession } from "./types";
import { toISO, daysAgo } from "./date";

/** A unified training event — machine workouts (from sessions) and logged activities
 *  flow into the same dashboard / recommendation engine. */
export interface TrainingEvent {
  date: string;
  tracker: TrackerKind;
  minutes: number;
  intensity?: ActivityIntensity;
  soreness?: SorenessLevel;
}

export function eventsFromActivityLogs(logs: ActivityLog[]): TrainingEvent[] {
  return logs.map((l) => ({ date: l.date, tracker: l.tracker, minutes: l.durationMin ?? 0, intensity: l.intensity, soreness: l.soreness }));
}

/** Completed machine workouts become "machine" training events. */
export function eventsFromSessions(sessions: WorkoutSession[]): TrainingEvent[] {
  return sessions
    .filter((s) => s.logCount > 0)
    .map((s) => ({
      date: s.date,
      tracker: "machine" as TrackerKind,
      minutes: s.endedAt && s.startedAt ? Math.max(0, Math.round((s.endedAt - s.startedAt) / 60000)) : 0,
    }));
}

export function mergeEvents(logs: ActivityLog[], sessions: WorkoutSession[]): TrainingEvent[] {
  return [...eventsFromActivityLogs(logs), ...eventsFromSessions(sessions)];
}

export function weekStartISO(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const back = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - back);
  return toISO(d);
}

const isStrength = (t: TrackerKind) => t === "machine" || t === "free-weight" || t === "bodyweight";

export interface WeekStats {
  totalSessions: number;
  totalMinutes: number;
  strengthSessions: number;
  machineSessions: number;
  freeWeightSessions: number;
  combatSessions: number;
  cardioMinutes: number;
  recoverySessions: number;
  activeDays: number;
  intensity: Record<ActivityIntensity, number>;
}

export function weekStats(events: TrainingEvent[]): WeekStats {
  const start = weekStartISO();
  const wk = events.filter((e) => e.date >= start);
  const intensity: Record<ActivityIntensity, number> = { easy: 0, moderate: 0, hard: 0, brutal: 0 };
  const days = new Set<string>();
  let totalMinutes = 0,
    strengthSessions = 0,
    machineSessions = 0,
    freeWeightSessions = 0,
    combatSessions = 0,
    cardioMinutes = 0,
    recoverySessions = 0;
  for (const e of wk) {
    totalMinutes += e.minutes;
    days.add(e.date);
    if (isStrength(e.tracker)) strengthSessions++;
    if (e.tracker === "machine") machineSessions++;
    if (e.tracker === "free-weight") freeWeightSessions++;
    if (e.tracker === "combat") combatSessions++;
    if (e.tracker === "cardio") cardioMinutes += e.minutes;
    if (e.tracker === "recovery") recoverySessions++;
    if (e.intensity) intensity[e.intensity]++;
  }
  return {
    totalSessions: wk.length,
    totalMinutes,
    strengthSessions,
    machineSessions,
    freeWeightSessions,
    combatSessions,
    cardioMinutes,
    recoverySessions,
    activeDays: days.size,
    intensity,
  };
}

/** Whole days since the last strength session (machine / free-weight / bodyweight). null = never. */
export function daysSinceStrength(events: TrainingEvent[]): number | null {
  const dates = events.filter((e) => isStrength(e.tracker)).map((e) => e.date).sort();
  return dates.length ? daysAgo(dates[dates.length - 1]) : null;
}

export interface Recommendation {
  text: string;
  tone: "rest" | "balance" | "push";
}

export interface RecoContext {
  profileName?: string;
  location?: GymLocation;
}

/** Universal recommendation engine (not profile-specific). */
export function recommend(events: TrainingEvent[], ctx: RecoContext = {}): Recommendation | null {
  // 1. High recent soreness → mobility / recovery.
  const recentSore = events.filter((e) => daysAgo(e.date) <= 2).some((e) => e.soreness === "high");
  if (recentSore) return { text: "Soreness is high — a mobility / recovery session would help you bounce back.", tone: "rest" };

  const wk = weekStats(events);

  // 2. Lots of combat / cardio this week → suggest recovery or strength to balance.
  if (wk.combatSessions + (wk.cardioMinutes >= 120 ? 1 : 0) >= 3) {
    return { text: "Plenty of combat / cardio this week — balance it with a strength or recovery day.", tone: "balance" };
  }

  // 3. No strength in 5+ days → simple full-body strength.
  const since = daysSinceStrength(events);
  if (since === null || since >= 5) {
    const where = ctx.location?.type === "home" || ctx.location?.type === "outdoor" ? "bodyweight or free-weight" : "full-body free-weight";
    return { text: since === null ? `No strength logged yet — try a simple ${where} session.` : `No strength in ${since} days — try a simple ${where} session.`, tone: "push" };
  }

  return null;
}
