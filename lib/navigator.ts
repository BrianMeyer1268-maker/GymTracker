import type { AppData, ExerciseLog, Machine, MovementCategory, WorkoutGoal } from "./types";
import { effectiveTemplate, SUBSTITUTES, type TemplateSlot } from "./movement";
import { machinesInCategories } from "./catalog";
import { lastLogFor } from "./analytics";
import { recommend } from "./progression";
import { busyProbability, nowCtx, type AvailLabel } from "./prediction";
import { todayISO } from "./date";

export type MachineTag = "best" | "option" | "substitute" | "used" | "busy";

export interface RankedMachine {
  machine: Machine;
  tag: MachineTag;
  busy: boolean;
  usedToday: boolean;
  flagged: boolean;
  favorite: boolean;
  trainer: boolean;
  avoid: boolean;
  /** Predicted availability at the current day/time. */
  busyProb: number;
  busyLabel: AvailLabel | null;
  busySamples: number;
  lastLog?: ExerciseLog;
}

export interface PlannedSlot extends TemplateSlot {
  status: "done" | "skipped" | "current" | "upcoming";
  doneMachineId?: string;
}

export interface NavPlan {
  goal: WorkoutGoal;
  slots: PlannedSlot[];
  current?: PlannedSlot;
  currentIndex: number;
  doneCount: number;
  skippedCount: number;
  total: number;
  complete: boolean;
  /** All non-optional slots are done or skipped (only optional work remains). */
  requiredComplete: boolean;
}

function usedTodayIds(data: AppData): Set<string> {
  const date = todayISO();
  return new Set(data.logs.filter((l) => l.date === date).map((l) => l.machineId).filter((id): id is string => !!id));
}

/** Walk today's template, marking slots done (from logs) or skipped. */
export function buildPlan(data: AppData): NavPlan | null {
  const goal = data.today?.goal;
  if (!goal) return null;
  const readiness = data.today?.readiness ?? "normal";
  const template = effectiveTemplate(goal, readiness, data.phase);
  const date = todayISO();
  const skipped = new Set(data.today?.skipped ?? []);

  const used = data.logs.filter((l) => l.date === date && l.goal === goal).slice();

  const slots: PlannedSlot[] = template.map((slot, i) => {
    if (skipped.has(i)) return { ...slot, status: "skipped" };
    const idx = used.findIndex((l) => slot.categories.includes(l.category));
    if (idx >= 0) {
      const done = used.splice(idx, 1)[0];
      return { ...slot, status: "done", doneMachineId: done.machineId };
    }
    return { ...slot, status: "upcoming" };
  });

  const currentIndex = slots.findIndex((s) => s.status === "upcoming");
  if (currentIndex >= 0) slots[currentIndex].status = "current";

  return {
    goal,
    slots,
    current: currentIndex >= 0 ? slots[currentIndex] : undefined,
    currentIndex,
    doneCount: slots.filter((s) => s.status === "done").length,
    skippedCount: slots.filter((s) => s.status === "skipped").length,
    total: slots.length,
    complete: currentIndex < 0,
    requiredComplete: slots.every((s) => s.optional || s.status === "done" || s.status === "skipped"),
  };
}

function rank(data: AppData, machines: Machine[], substitute: boolean): RankedMachine[] {
  const busySet = new Set(data.today?.busy ?? []);
  const used = usedTodayIds(data);
  const flagged = new Set(data.flagged);
  const ctx = nowCtx();

  const items: RankedMachine[] = machines.map((machine) => {
    const pred = busyProbability(data.observations, machine.id, ctx);
    return {
      machine,
      busy: busySet.has(machine.id),
      usedToday: used.has(machine.id),
      flagged: flagged.has(machine.id),
      favorite: machine.rating === "favorite",
      trainer: !!machine.trainer,
      avoid: machine.rating === "avoid",
      busyProb: pred.prob,
      busyLabel: pred.label,
      busySamples: pred.samples,
      lastLog: lastLogFor(data.logs, machine.id),
      tag: "option",
    };
  });

  const statusRank = (r: RankedMachine) => (r.busy ? 3 : r.usedToday ? 2 : 0);
  const progressionReady = (r: RankedMachine) => !!r.lastLog && recommend(r.machine, r.lastLog, data.phase, r.flagged).action === "increase";
  // Predicted-busy machines sink even before being tapped (only when we're confident).
  const predPenalty = (r: RankedMachine) => (r.busySamples >= 3 ? r.busyProb * 10 : 0);
  // Lower = ranked earlier. Order: favorite/trainer > progression need > availability.
  const priority = (r: RankedMachine) =>
    (r.avoid ? 100 : 0) + (r.favorite ? -20 : 0) + (r.trainer ? -10 : 0) + (progressionReady(r) ? -6 : 0) + (r.lastLog ? -2 : 0) + predPenalty(r) + (r.machine.needsNaming ? 1 : 0);

  items.sort((a, b) => {
    const s = statusRank(a) - statusRank(b);
    if (s !== 0) return s;
    const p = priority(a) - priority(b);
    if (p !== 0) return p;
    return a.machine.name.localeCompare(b.machine.name);
  });

  // "Best" star goes to the top available machine that isn't predicted busy
  // (so when a favorite is usually busy now, the star points at a free alternative).
  const isAvail = (r: RankedMachine) => !r.busy && !r.usedToday && !r.avoid;
  const bestPick =
    items.find((r) => isAvail(r) && r.busyLabel === "free") ??
    items.find((r) => isAvail(r) && r.busyLabel !== "busy") ??
    items.find(isAvail);
  for (const r of items) {
    if (r.busy) r.tag = "busy";
    else if (r.usedToday) r.tag = "used";
    else if (substitute) r.tag = "substitute";
    else if (r === bestPick) r.tag = "best";
    else r.tag = "option";
  }
  return items;
}

/** The intended machines for a slot (its own categories). */
export function slotMachines(data: AppData, slot: TemplateSlot): RankedMachine[] {
  return rank(data, machinesInCategories(data.machines, slot.categories), false);
}

/** Equivalent movements for when the planned machines are busy. */
export function slotSubstitutes(data: AppData, slot: TemplateSlot): RankedMachine[] {
  const own = new Set<MovementCategory>(slot.categories);
  const subCats = new Set<MovementCategory>();
  for (const c of slot.categories) for (const s of SUBSTITUTES[c]) if (!own.has(s)) subCats.add(s);
  return rank(data, machinesInCategories(data.machines, Array.from(subCats)), true);
}

/** Machines in a single category (used by the catalog / direct picks). */
export function categoryMachines(data: AppData, category: MovementCategory): RankedMachine[] {
  return rank(data, machinesInCategories(data.machines, [category]), false);
}
