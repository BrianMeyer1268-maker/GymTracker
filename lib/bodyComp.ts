import type { BodyCompEntry } from "./types";
import type { StrengthDirection } from "./analytics";

export type BodyMetric = "weight" | "bodyFat" | "skeletalMuscle" | "visceralFat" | "waist";

export interface MetricTrend {
  latest?: number;
  previous?: number;
  first?: number;
  deltaPrev?: number;
  deltaFirst?: number;
  /** net change used for analysis (long trend if we have it, else recent) */
  net?: number;
  series: { date: string; value: number }[];
  n: number;
}

export function sortedBodyComp(entries: BodyCompEntry[]): BodyCompEntry[] {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

export function metricTrend(entries: BodyCompEntry[], key: BodyMetric): MetricTrend {
  const series = sortedBodyComp(entries)
    .map((e) => ({ date: e.date, value: e[key] }))
    .filter((p): p is { date: string; value: number } => typeof p.value === "number");
  const n = series.length;
  if (n === 0) return { series: [], n: 0 };
  const latest = series[n - 1].value;
  const previous = n >= 2 ? series[n - 2].value : undefined;
  const first = series[0].value;
  const deltaPrev = previous === undefined ? undefined : round(latest - previous);
  const deltaFirst = round(latest - first);
  const net = n >= 3 ? deltaFirst : deltaPrev;
  return { latest, previous, first, deltaPrev, deltaFirst, net, series, n };
}

export interface RecompResult {
  title: string;
  text: string;
  tone: "up" | "hold" | "down" | "neutral";
}

/**
 * Recomposition analyzer.
 *  weight down + fat down + strength up   -> Successful Recomposition
 *  weight down + strength down            -> Potential Lean Mass Loss
 *  ...plus the sensible in-between states.
 */
export function recompAnalyzer(entries: BodyCompEntry[], strength: StrengthDirection): RecompResult {
  const w = metricTrend(entries, "weight").net;
  const f = metricTrend(entries, "bodyFat").net;
  const mu = metricTrend(entries, "skeletalMuscle").net;

  if (w === undefined && f === undefined) {
    return { title: "Not enough data", text: "Add another body-comp entry to analyze your trend.", tone: "neutral" };
  }

  const weightDown = (w ?? 0) < -0.2;
  const weightUp = (w ?? 0) > 0.2;
  const fatDown = (f ?? 0) < -0.1;
  const muscleUp = (mu ?? 0) > 0.1;
  const strengthUp = strength === "up";
  const strengthDown = strength === "down";

  if (weightDown && strengthDown) {
    return {
      title: "Potential Lean Mass Loss",
      text: "Weight is down but strength is slipping. Eat enough protein, keep loads heavy, and don't cut too fast — you want to lose fat, not muscle.",
      tone: "down",
    };
  }
  if (weightDown && fatDown && (strengthUp || muscleUp)) {
    return {
      title: "Successful Recomposition",
      text: "Textbook result: weight and body fat down while strength/muscle hold or rise. Keep doing exactly this.",
      tone: "up",
    };
  }
  if (fatDown && (strengthUp || muscleUp)) {
    return {
      title: "Recomposition Underway",
      text: "Body fat is dropping while strength holds — muscle is staying put or building. Stay consistent.",
      tone: "up",
    };
  }
  if (weightDown && !strengthDown) {
    return {
      title: "Fat Loss on Track",
      text: "Weight is trending down and strength is holding. Keep protein high to protect muscle.",
      tone: "up",
    };
  }
  if (strengthUp && weightUp && muscleUp) {
    return {
      title: "Building Phase",
      text: "Strength, weight, and muscle are climbing together. Good for a gaining phase — watch body fat if recomp is the goal.",
      tone: "hold",
    };
  }
  return { title: "Holding Steady", text: "No strong trend yet. Keep logging workouts and weigh-ins.", tone: "neutral" };
}
