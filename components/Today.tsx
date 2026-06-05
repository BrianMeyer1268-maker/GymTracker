"use client";

import { useEffect, useState } from "react";
import type { ActivityType, Crowd, Phase, Readiness, WorkoutGoal } from "@/lib/types";
import { CROWD_OPTS, GOALS, PHASES, READINESS_OPTS } from "@/lib/types";
import { useStore } from "@/lib/store";
import { sortedBodyComp } from "@/lib/bodyComp";
import { lastWorkoutDate, suggestGoal } from "@/lib/analytics";
import { GOAL_ICON, GOAL_LABEL, PHASE_LABEL, PHASE_HINT, READINESS_LABEL } from "@/lib/movement";
import { CROWD_LABEL } from "@/lib/timing";
import { relDate } from "@/lib/date";
import { GYM_TYPE_ICON, ACTIVITY_LABEL, ACTIVITY_ICON, trackerFor, defaultActivityFor } from "@/lib/gyms";
import Navigator from "./Navigator";
import Segmented from "./Segmented";
import Sheet from "./Sheet";
import AIImport from "./AIImport";
import LocationPicker from "./LocationPicker";
import ActivityTracker from "./ActivityTracker";
import ActivityDashboard from "./ActivityDashboard";

const CROWD_CLASS: Record<Crowd, string> = {
  empty: "bg-good/20 border-good text-good",
  light: "bg-good/20 border-good text-good",
  normal: "bg-accent/20 border-accent text-accent",
  busy: "bg-warn/20 border-warn text-warn",
  packed: "bg-bad/20 border-bad text-bad",
};

const GOAL_RING: Record<WorkoutGoal, string> = {
  push: "border-push/60 bg-push/10",
  pull: "border-pull/60 bg-pull/10",
  legs: "border-legs/60 bg-legs/10",
  "full-body": "border-full/60 bg-full/10",
  conditioning: "border-cond/60 bg-cond/10",
  recovery: "border-recovery/60 bg-recovery/10",
};

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex-1">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">{label}</div>
      <div className="text-base font-extrabold tabular-nums leading-tight">
        {value}
        {unit ? <span className="text-[11px] font-semibold text-muted"> {unit}</span> : null}
      </div>
    </div>
  );
}

export default function Today({ showToast, onSwitchProfile }: { showToast: (m: string) => void; onSwitchProfile: () => void }) {
  const { data, activeProfile, activeLocation, setPhase, setReadiness, setCrowd, setGoal } = useStore();
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [activity, setActivity] = useState<ActivityType | undefined>(undefined);

  // When the location changes, fall back to its default activity (machine gyms → navigator).
  useEffect(() => {
    setActivity(defaultActivityFor(activeLocation));
  }, [activeLocation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loc = activeLocation;
  const acts = loc?.activities ?? [];
  const tracker = activity ? trackerFor(activity) : undefined;
  const machineMode = tracker === "machine";

  const latest = sortedBodyComp(data.bodyComp).slice(-1)[0];
  const lastWk = lastWorkoutDate(data.logs);
  const readiness = data.today?.readiness;
  const crowd = data.today?.crowd;
  const goal = data.today?.goal;
  const suggested = suggestGoal(data.logs, readiness);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <button onClick={onSwitchProfile} className="flex items-center gap-2.5 text-left active:opacity-70" aria-label="Switch profile">
          <span className="flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold text-[#04181f]" style={{ backgroundColor: activeProfile?.color ?? "#38bdf8" }}>
            {(activeProfile?.name ?? "?").trim().charAt(0).toUpperCase()}
          </span>
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-faint">{activeProfile?.name ?? "Iron Compass"} ▾</span>
            <span className="block text-2xl font-extrabold leading-tight">Today</span>
          </span>
        </button>
        {machineMode ? (
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface2 text-base active:bg-surface3" aria-label="AI import" onClick={() => setAiOpen(true)}>
              ✨
            </button>
            <button className="flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 py-2 text-sm font-bold active:bg-surface3" onClick={() => setPhaseOpen(true)}>
              <span className="h-2 w-2 rounded-full bg-accent" /> {PHASE_LABEL[data.phase]} <span className="text-faint">▾</span>
            </button>
          </div>
        ) : null}
      </header>

      {/* Location chip */}
      <button onClick={() => setLocOpen(true)} className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3.5 py-2.5 active:bg-surface3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
          <span className="text-lg" aria-hidden>{GYM_TYPE_ICON[loc?.type ?? "machine"]}</span>
          <span className="truncate">{loc?.nickname || loc?.name || "Choose location"}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-faint">Change ▾</span>
      </button>

      {/* Active activity chip */}
      {activity ? (
        <button onClick={() => setActivity(undefined)} className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 active:bg-accent/15">
          <span className="flex items-center gap-2 text-sm font-bold text-accent">
            <span aria-hidden>{ACTIVITY_ICON[activity]}</span> {ACTIVITY_LABEL[activity]}
          </span>
          <span className="text-xs font-semibold text-accent/80">Change ▾</span>
        </button>
      ) : null}

      {aiOpen ? <AIImport onClose={() => setAiOpen(false)} showToast={showToast} /> : null}

      {!activity ? (
        // ---- Activity chooser ----
        <>
          <ActivityDashboard />
          <div>
            <div className="mb-2 px-1 text-sm font-bold">Choose an activity{loc ? ` at ${loc.nickname || loc.name}` : ""}</div>
            {acts.length ? (
              <div className="grid grid-cols-2 gap-3">
                {acts.map((a) => (
                  <button key={a} onClick={() => setActivity(a)} className="tap flex min-h-[84px] flex-col items-start justify-between rounded-2xl border border-line bg-surface p-3.5 text-left active:scale-[0.99]">
                    <span className="text-2xl" aria-hidden>{ACTIVITY_ICON[a]}</span>
                    <span className="text-sm font-extrabold leading-tight">{ACTIVITY_LABEL[a]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center text-sm text-faint">No activities set for this location yet — edit it from the location picker.</div>
            )}
          </div>
        </>
      ) : machineMode ? (
        // ---- Machine navigator flow ----
        <>
          {!goal ? (
            <div className="card p-3.5">
              <div className="flex gap-2">
                <Stat label="Weight" value={latest?.weight != null ? String(latest.weight) : "—"} unit="lb" />
                <Stat label="Body Fat" value={latest?.bodyFat != null ? String(latest.bodyFat) : "—"} unit="%" />
                <Stat label="Muscle" value={latest?.skeletalMuscle != null ? String(latest.skeletalMuscle) : "—"} unit="lb" />
                <Stat label="Visceral" value={latest?.visceralFat != null ? String(latest.visceralFat) : "—"} />
              </div>
              <div className="mt-2.5 border-t border-line pt-2 text-xs text-muted">
                Last workout: <span className="font-semibold text-ink">{lastWk ? relDate(lastWk) : "none yet"}</span>
              </div>
            </div>
          ) : null}

          {goal ? (
            <Navigator showToast={showToast} />
          ) : (
            <>
              <div>
                <div className="mb-2 px-1 text-sm font-bold">How do you feel today?</div>
                <Segmented
                  options={READINESS_OPTS.map((r) => ({
                    value: r,
                    label: READINESS_LABEL[r],
                    selectedClass:
                      r === "great" ? "bg-good/20 border-good text-good" : r === "normal" ? "bg-accent/20 border-accent text-accent" : r === "tired" ? "bg-warn/20 border-warn text-warn" : "bg-bad/20 border-bad text-bad",
                  }))}
                  value={readiness}
                  onChange={setReadiness}
                  columns={4}
                />
              </div>
              <div>
                <div className="mb-2 px-1 text-sm font-bold">How crowded is the gym?</div>
                <Segmented options={CROWD_OPTS.map((c) => ({ value: c, label: CROWD_LABEL[c], selectedClass: CROWD_CLASS[c] }))} value={crowd} onChange={setCrowd} columns={5} />
              </div>
              <div>
                <div className="mb-2 px-1 text-sm font-bold">
                  Pick today&apos;s workout
                  <span className="ml-2 text-xs font-medium text-faint">suggested: {GOAL_LABEL[suggested]}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <button key={g} onClick={() => setGoal(g)} className={`tap relative flex min-h-[88px] flex-col items-start justify-between rounded-2xl border p-3.5 text-left active:scale-[0.99] ${g === suggested ? GOAL_RING[g] : "border-line bg-surface"}`}>
                      <span className="text-2xl" aria-hidden>{GOAL_ICON[g]}</span>
                      <span className="text-base font-extrabold">{GOAL_LABEL[g]}</span>
                      {g === suggested ? <span className="chip absolute right-2 top-2 bg-accent/15 text-accent">Suggested</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        // ---- Free-weight / cardio / combat / bodyweight / recovery tracker ----
        <ActivityTracker activity={activity} showToast={showToast} />
      )}

      {/* Phase sheet */}
      <Sheet open={phaseOpen} onClose={() => setPhaseOpen(false)} title="Training phase">
        <Segmented options={PHASES.map((p) => ({ value: p, label: PHASE_LABEL[p] }))} value={data.phase} onChange={(p: Phase) => setPhase(p)} columns={2} />
        <p className="mt-3 text-sm text-muted">{PHASE_HINT[data.phase]}</p>
        <button className="mt-4 min-h-[48px] w-full rounded-xl bg-accent font-bold text-accent-ink" onClick={() => setPhaseOpen(false)}>Done</button>
      </Sheet>

      {locOpen ? <LocationPicker onClose={() => setLocOpen(false)} /> : null}
    </div>
  );
}
