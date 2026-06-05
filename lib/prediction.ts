import type { AvailabilityObservation, Machine, SwitchReason, TimeBucket } from "./types";
import { timeBucket, DOW_LONG } from "./date";
import { BUCKET_LABEL } from "./timing";

export interface PredCtx {
  dayOfWeek: number;
  bucket: TimeBucket;
}

export function nowCtx(): PredCtx {
  const d = new Date();
  return { dayOfWeek: d.getDay(), bucket: timeBucket(d) };
}

export type AvailLabel = "free" | "sometimes" | "busy";

export interface BusyPred {
  prob: number;
  samples: number;
  /** null when there aren't enough samples for a confident label. */
  label: AvailLabel | null;
}

const MIN_CONFIDENT = 3;

function isBusy(o: AvailabilityObservation): boolean {
  return o.action === "busy" || o.action === "became-busy";
}

/** Historical busy probability for a machine at the current day/time, with fallback tiers. */
export function busyProbability(obs: AvailabilityObservation[], machineId: string, ctx: PredCtx): BusyPred {
  const mine = obs.filter((o) => o.machineId === machineId);
  const tiers = [
    mine.filter((o) => o.dayOfWeek === ctx.dayOfWeek && o.bucket === ctx.bucket),
    mine.filter((o) => o.bucket === ctx.bucket),
    mine,
  ];
  for (const t of tiers) {
    if (t.length >= MIN_CONFIDENT) {
      const prob = t.filter(isBusy).length / t.length;
      return { prob, samples: t.length, label: prob >= 0.6 ? "busy" : prob >= 0.3 ? "sometimes" : "free" };
    }
  }
  const all = mine;
  if (all.length >= 1) return { prob: all.filter(isBusy).length / all.length, samples: all.length, label: null };
  return { prob: 0, samples: 0, label: null };
}

export const AVAIL_TEXT: Record<AvailLabel, string> = {
  free: "Usually free now",
  sometimes: "Sometimes busy now",
  busy: "Usually busy now",
};

/** "Thursday evenings" */
export function whenPhrase(ctx: PredCtx): string {
  return `${DOW_LONG[ctx.dayOfWeek]} ${BUCKET_LABEL[ctx.bucket].toLowerCase()}s`;
}

// ---------- Smart suggestion ----------
export interface SmartSuggestion {
  busyName: string;
  altName: string;
  text: string;
}

/**
 * If a favorite/trainer machine in this slot is usually busy now and a freer
 * alternative exists, suggest trying the alternative first.
 */
export function smartSuggestion(
  ranked: { machine: Machine; busyProb: number; busyLabel: AvailLabel | null; busy: boolean; usedToday: boolean }[],
  ctx: PredCtx,
): SmartSuggestion | null {
  const busyFav = ranked.find((r) => (r.machine.rating === "favorite" || r.machine.trainer) && r.busyLabel === "busy");
  if (!busyFav) return null;
  const free = (r: (typeof ranked)[number]) => r !== busyFav && !r.busy && !r.usedToday;
  const alt = ranked.find((r) => free(r) && r.busyLabel === "free") ?? ranked.find((r) => free(r) && r.busyLabel !== "busy");
  if (!alt) return null;
  return {
    busyName: busyFav.machine.name,
    altName: alt.machine.name,
    text: `${busyFav.machine.name} is often busy ${whenPhrase(ctx)}. Try ${alt.machine.name} first.`,
  };
}

// ---------- Recommendation explanation ----------
export interface PickExplanation {
  best?: string;
  why?: string; // why not another
}

export function explainPick(
  ranked: { machine: Machine; tag: string; busyLabel: AvailLabel | null; categoryLabel: string }[],
): PickExplanation {
  const best = ranked.find((r) => r.tag === "best");
  const out: PickExplanation = {};
  if (best) {
    const reasons: string[] = [];
    if (best.machine.trainer) reasons.push("trainer favorite");
    else if (best.machine.rating === "favorite") reasons.push("a favorite");
    reasons.push(`correct ${best.categoryLabel.toLowerCase()} slot`);
    if (best.busyLabel) reasons.push(AVAIL_TEXT[best.busyLabel].toLowerCase());
    out.best = `Best next: ${best.machine.name}. ${reasons.join(", ")}.`;
  }
  const demoted = ranked.find((r) => r !== best && r.busyLabel === "busy" && (r.machine.rating === "favorite" || r.machine.trainer));
  if (demoted) out.why = `Skipped ${demoted.machine.name}: often busy at this time.`;
  return out;
}

// ---------- Timing-tab data ----------
export interface HeatCell {
  bucket: TimeBucket;
  prob: number;
  samples: number;
}
export interface MachineHeat {
  machine: Machine;
  cells: HeatCell[];
  total: number;
}

const BUCKETS_ORDER: TimeBucket[] = ["early-morning", "morning", "lunch", "afternoon", "evening", "late-night"];

/** Busy-probability grid for the most-observed machines. */
export function busyHeatmap(obs: AvailabilityObservation[], machines: Machine[], topN = 8): MachineHeat[] {
  const counts = new Map<string, number>();
  for (const o of obs) counts.set(o.machineId, (counts.get(o.machineId) ?? 0) + 1);
  const ids = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id]) => id);
  const out: MachineHeat[] = [];
  for (const id of ids) {
    const machine = machines.find((m) => m.id === id);
    if (!machine) continue;
    const mine = obs.filter((o) => o.machineId === id);
    const cells = BUCKETS_ORDER.map((bucket) => {
      const t = mine.filter((o) => o.bucket === bucket);
      return { bucket, prob: t.length ? t.filter(isBusy).length / t.length : -1, samples: t.length };
    });
    out.push({ machine, cells, total: mine.length });
  }
  return out;
}

export interface RankedAvail {
  machine: Machine;
  prob: number;
  samples: number;
}

/** Machines ranked by how free / busy they are at the current time. */
export function availabilityRanking(obs: AvailabilityObservation[], machines: Machine[], ctx: PredCtx): { free: RankedAvail[]; busy: RankedAvail[] } {
  const rows: RankedAvail[] = [];
  for (const m of machines) {
    const p = busyProbability(obs, m.id, ctx);
    if (p.samples >= MIN_CONFIDENT) rows.push({ machine: m, prob: p.prob, samples: p.samples });
  }
  const free = rows.filter((r) => r.prob < 0.4).sort((a, b) => a.prob - b.prob).slice(0, 5);
  const busy = rows.filter((r) => r.prob > 0.5).sort((a, b) => b.prob - a.prob).slice(0, 5);
  return { free, busy };
}

// ---------- Switch reasons ----------
export const SWITCH_REASONS: { value: SwitchReason; label: string; marksBusy: boolean }[] = [
  { value: "busy", label: "Busy now", marksBusy: true },
  { value: "became-occupied", label: "Someone took it", marksBusy: true },
  { value: "not-working", label: "Not working", marksBusy: false },
  { value: "bad-fit", label: "Bad fit / ROM", marksBusy: false },
  { value: "pain", label: "Pain / off", marksBusy: false },
  { value: "substitute", label: "Just switching", marksBusy: false },
];

export const SWITCH_REASON_LABEL: Record<SwitchReason, string> = {
  busy: "busy",
  "became-occupied": "occupied",
  "not-working": "not working",
  "bad-fit": "bad fit",
  pain: "pain",
  substitute: "switched",
  skipped: "skipped",
};
