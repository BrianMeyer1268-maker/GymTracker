"use client";

import { useRef, useState } from "react";
import type { SwitchReason, WorkoutGoal } from "@/lib/types";
import { useStore } from "@/lib/store";
import { buildPlan, slotMachines, slotSubstitutes } from "@/lib/navigator";
import { findMachine } from "@/lib/catalog";
import { downscaleImage } from "@/lib/photos";
import { GOAL_ICON, GOAL_LABEL, CATEGORY_LABEL } from "@/lib/movement";
import { smartSuggestion, explainPick, nowCtx, type PickExplanation } from "@/lib/prediction";
import MachineCard from "./MachineCard";
import ExerciseLogger from "./ExerciseLogger";
import WorkoutSummary from "./WorkoutSummary";

const GOAL_BAR: Record<WorkoutGoal, string> = {
  push: "bg-push",
  pull: "bg-pull",
  legs: "bg-legs",
  "full-body": "bg-full",
  conditioning: "bg-cond",
  recovery: "bg-recovery",
};
const ROLE_LABEL: Record<string, string> = { primary: "Primary", secondary: "Secondary", accessory: "Accessory", finisher: "Finisher" };

export default function Navigator({ showToast }: { showToast: (m: string) => void }) {
  const { data, toggleBusy, recordSwitch, pickMachine, setActiveMachine, skipSlot, clearGoal, endWorkout, setGymPhoto } = useStore();
  const [showSubs, setShowSubs] = useState(false);
  const [ending, setEnding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<string | null>(null);
  const plan = buildPlan(data);
  if (!plan) return null;

  const goal = plan.goal;
  const active = data.today?.activeMachineId ? findMachine(data.machines, data.today.activeMachineId) : undefined;

  function leave(reason: SwitchReason) {
    const id = data.today?.activeMachineId;
    if (id) recordSwitch(id, reason);
    else setActiveMachine(undefined);
    setShowSubs(true);
  }

  function openPhoto(id: string) {
    photoTarget.current = id;
    fileRef.current?.click();
  }
  async function onPhotoFile(file: File) {
    const id = photoTarget.current;
    if (!id) return;
    try {
      setGymPhoto(id, await downscaleImage(file));
      showToast("Gym photo saved ✓");
    } catch {
      showToast("Couldn't read that photo");
    }
  }

  // Summary view (finished, or ending early)
  if (plan.complete || ending) {
    return <WorkoutSummary onEnd={endWorkout} onResume={plan.complete ? undefined : () => setEnding(false)} />;
  }

  const current = plan.current;
  const primary = current ? slotMachines(data, current) : [];
  const subs = current ? slotSubstitutes(data, current) : [];
  const noneAvailable = primary.length === 0 || primary.every((r) => r.busy || r.usedToday);

  const ctx = nowCtx();
  const suggestion = current ? smartSuggestion(primary, ctx) : null;
  const explanation: PickExplanation = current
    ? explainPick(primary.map((r) => ({ machine: r.machine, tag: r.tag, busyLabel: r.busyLabel, categoryLabel: CATEGORY_LABEL[r.machine.category] })))
    : {};

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {GOAL_ICON[goal]}
          </span>
          <div className="flex-1">
            <div className="text-lg font-extrabold leading-tight">{GOAL_LABEL[goal]} Day</div>
            <div className="text-xs text-muted">
              {plan.doneCount} done{plan.skippedCount ? ` · ${plan.skippedCount} skipped` : ""} · {plan.total} planned
            </div>
          </div>
          <button className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted active:bg-surface2" onClick={clearGoal}>
            Change
          </button>
        </div>
        <div className="mt-3 flex gap-1">
          {plan.slots.map((s, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                s.status === "done" ? GOAL_BAR[goal] : s.status === "skipped" ? "bg-surface3 opacity-50" : s.status === "current" ? "bg-accent" : "bg-surface3"
              }`}
            />
          ))}
        </div>
      </div>

      {plan.requiredComplete ? (
        <div className="rounded-xl border border-good/40 bg-good/10 p-3 text-center text-sm">
          <span className="font-bold text-good">Required work done.</span> <span className="text-muted">Add an optional finisher or wrap up.</span>
        </div>
      ) : null}

      {current ? (
        <>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-faint">
              {ROLE_LABEL[current.role]}
              {current.optional ? " · optional" : ""} · next up
            </div>
            <h2 className="text-2xl font-extrabold leading-tight">{current.label}</h2>
            <p className="mt-1 text-xs text-muted">Tap the machine that&apos;s open. Mark anything in use as busy.</p>
          </div>

          {suggestion ? (
            <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
              <span className="font-bold text-accent">💡</span> <span className="text-muted">{suggestion.text}</span>
            </div>
          ) : explanation.best ? (
            <p className="px-1 text-[12px] leading-snug text-muted">
              <span className="font-semibold text-good">✓</span> {explanation.best}
              {explanation.why ? <span className="text-faint"> · {explanation.why}</span> : null}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            {primary.map((r) => (
              <MachineCard key={r.machine.id} ranked={r} onPick={(id) => pickMachine(id, false)} onToggleBusy={toggleBusy} onAddPhoto={openPhoto} />
            ))}
            {primary.length === 0 ? (
              <div className="card p-4 text-sm text-muted">No machines catalogued for this slot. Add one in Machines, use a substitute, or skip.</div>
            ) : null}
          </div>

          {/* Substitutes */}
          {subs.length > 0 ? (
            <div>
              {!showSubs && !noneAvailable ? (
                <button className="min-h-[44px] w-full rounded-xl border border-line text-sm font-semibold text-muted active:bg-surface2" onClick={() => setShowSubs(true)}>
                  Everything busy? Choose substitute
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="px-1 text-[11px] font-bold uppercase tracking-widest text-faint">{noneAvailable ? "Substitutes — same movement" : "Substitutes"}</div>
                  {subs.map((r) => (
                    <MachineCard key={r.machine.id} ranked={r} onPick={(id) => pickMachine(id, true)} onToggleBusy={toggleBusy} onAddPhoto={openPhoto} />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Slot actions */}
          <div className="flex gap-2">
            <button className="min-h-[44px] flex-1 rounded-xl border border-line text-sm font-semibold text-muted active:bg-surface2" onClick={() => skipSlot(plan.currentIndex)}>
              Skip this movement →
            </button>
            {plan.requiredComplete ? (
              <button className="min-h-[44px] flex-1 rounded-xl bg-accent text-sm font-bold text-accent-ink active:scale-[0.99]" onClick={() => setEnding(true)}>
                Finish workout
              </button>
            ) : (
              <button className="min-h-[44px] flex-1 rounded-xl border border-line text-sm font-semibold text-faint active:bg-surface2" onClick={() => setEnding(true)}>
                End workout
              </button>
            )}
          </div>
        </>
      ) : null}

      {active && goal ? (
        <ExerciseLogger key={active.id} machine={active} goal={goal} onClose={() => setActiveMachine(undefined)} onLeave={leave} showToast={showToast} />
      ) : null}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhotoFile(f); e.target.value = ""; }} />
    </div>
  );
}
