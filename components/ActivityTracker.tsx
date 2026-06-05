"use client";

import { useState } from "react";
import type { ActivityType, ActivityIntensity, SorenessLevel, WorkoutGoal, MovementCategory } from "@/lib/types";
import { ACTIVITY_INTENSITIES, SORENESS_LEVELS } from "@/lib/types";
import { useStore } from "@/lib/store";
import { trackerFor, ACTIVITY_LABEL, ACTIVITY_ICON, COMBAT_FOCUS, CARDIO_SUBTYPES, RECOVERY_FOCUS } from "@/lib/gyms";
import { exerciseById, exerciseName, EXERCISE_GROUPS, MOVEMENT_TAG_LABEL, type MovementTag } from "@/lib/exercises";
import { progressionKey } from "@/lib/progression";
import { relDate } from "@/lib/date";
import Segmented from "./Segmented";
import ExercisePicker from "./ExercisePicker";

const MOVEMENT_GOAL: Record<MovementTag, WorkoutGoal> = { push: "push", pull: "pull", legs: "legs", hinge: "legs", core: "full-body", carry: "full-body" };
const MOVEMENT_CATEGORY: Record<MovementTag, MovementCategory> = { push: "horizontal-push", pull: "horizontal-pull", legs: "squat", hinge: "hinge", core: "core", carry: "core" };
function parseRepList(text: string): number[] {
  return text.split(/[^\d]+/).map((s) => parseInt(s, 10)).filter((n) => n > 0 && n < 100);
}

function Chips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface2 text-muted"}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

const INTENSITY: { value: ActivityIntensity; label: string; selectedClass: string }[] = [
  { value: "easy", label: "Easy", selectedClass: "bg-good/20 border-good text-good" },
  { value: "moderate", label: "Moderate", selectedClass: "bg-accent/20 border-accent text-accent" },
  { value: "hard", label: "Hard", selectedClass: "bg-warn/20 border-warn text-warn" },
  { value: "brutal", label: "Brutal", selectedClass: "bg-bad/20 border-bad text-bad" },
];
const SORENESS: { value: SorenessLevel; label: string }[] = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Mod" },
  { value: "high", label: "High" },
];

const inputCls = "min-h-[44px] w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";
const lbl = "mb-1.5 block text-sm font-bold";

export default function ActivityTracker({ activity, showToast }: { activity: ActivityType; showToast: (m: string) => void }) {
  const { data, logActivity, saveExercise, deleteActivityLog } = useStore();
  const tracker = trackerFor(activity);
  const perExercise = tracker === "free-weight" || tracker === "bodyweight";

  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<ActivityIntensity | undefined>(tracker === "recovery" ? "easy" : undefined);
  const [soreness, setSoreness] = useState<SorenessLevel | undefined>();
  const [notes, setNotes] = useState("");
  const [subType, setSubType] = useState<string | undefined>();
  const [distance, setDistance] = useState("");
  const [pace, setPace] = useState("");
  const [routeNotes, setRouteNotes] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [sparring, setSparring] = useState(false);
  const [rounds, setRounds] = useState("");
  const [roundLen, setRoundLen] = useState("");
  const [skillFocus, setSkillFocus] = useState("");
  const [focuses, setFocuses] = useState<string[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [exLogs, setExLogs] = useState<Record<string, { weight: string; reps: string }>>({});

  const tog = (setter: (f: (p: string[]) => string[]) => void) => (v: string) => setter((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  function reset() {
    setDuration("");
    setIntensity(tracker === "recovery" ? "easy" : undefined);
    setSoreness(undefined);
    setNotes("");
    setSubType(undefined);
    setDistance("");
    setPace("");
    setRouteNotes("");
    setHeartRate("");
    setSparring(false);
    setRounds("");
    setRoundLen("");
    setSkillFocus("");
    setFocuses([]);
    setExercises([]);
    setExLogs({});
  }

  function save() {
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s) || undefined);
    const defs = exercises.map((id) => exerciseById(id)).filter((d): d is NonNullable<typeof d> => !!d);
    const movements = Array.from(new Set(defs.map((d) => MOVEMENT_TAG_LABEL[d.movement])));
    const equipment = Array.from(new Set(defs.map((d) => EXERCISE_GROUPS.find((g) => g.id === d.group)?.name).filter((x): x is string => !!x)));

    // Per-exercise progression logs (each exercise keeps its own weight/reps history).
    if (perExercise) {
      for (const d of defs) {
        const v = exLogs[d.id];
        if (!v) continue;
        const reps = parseRepList(v.reps);
        const weight = Number(v.weight) || 0;
        if (!reps.length && !weight) continue;
        saveExercise({
          category: MOVEMENT_CATEGORY[d.movement],
          goal: MOVEMENT_GOAL[d.movement],
          weight,
          sets: reps,
          difficulty: "right",
          pain: "none",
          exerciseId: d.id,
          exerciseName: d.name,
          equipmentGroup: d.group,
          progressionKey: progressionKey({ equipmentGroup: d.group, exerciseId: d.id }),
        });
      }
    }

    logActivity({
      activity,
      tracker,
      durationMin: num(duration),
      intensity,
      soreness,
      notes: notes.trim() || undefined,
      subType,
      distance: num(distance),
      pace: pace.trim() || undefined,
      routeNotes: routeNotes.trim() || undefined,
      heartRate: num(heartRate),
      sparring: tracker === "combat" ? sparring : undefined,
      rounds: num(rounds),
      roundLengthMin: num(roundLen),
      skillFocus: skillFocus.trim() || undefined,
      focuses: focuses.length ? focuses : undefined,
      movements: movements.length ? movements : undefined,
      equipment: equipment.length ? equipment : undefined,
      exercises: exercises.length ? exercises : undefined,
    });
    showToast(`${ACTIVITY_LABEL[activity]} logged ✓`);
    reset();
  }

  const recent = data.activityLogs.filter((l) => l.tracker === tracker).slice(-5).reverse();
  const subtypes = CARDIO_SUBTYPES[activity] ?? [];
  const combatFocus = COMBAT_FOCUS[activity] ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-lg font-extrabold">
        <span aria-hidden>{ACTIVITY_ICON[activity]}</span> {ACTIVITY_LABEL[activity]}
      </div>

      {/* cardio sub-type */}
      {tracker === "cardio" && subtypes.length ? (
        <div><span className={lbl}>Type</span><Chips options={subtypes} value={subType ? [subType] : []} onToggle={(v) => setSubType((p) => (p === v ? undefined : v))} /></div>
      ) : null}

      {/* combat focus */}
      {tracker === "combat" && combatFocus.length ? (
        <div><span className={lbl}>Focus</span><Chips options={combatFocus} value={focuses} onToggle={tog(setFocuses)} /></div>
      ) : null}

      {/* exercises grouped by equipment / system */}
      {tracker === "free-weight" ? (
        <div><span className={lbl}>Exercises</span><ExercisePicker groups={["barbell", "dumbbell", "kettlebell", "cable", "band"]} value={exercises} onChange={setExercises} /></div>
      ) : null}
      {tracker === "bodyweight" ? (
        <div><span className={lbl}>Exercises</span><ExercisePicker groups={["bodyweight", "band"]} value={exercises} onChange={setExercises} /></div>
      ) : null}

      {/* Per-exercise sets — each builds its own progression history */}
      {perExercise && exercises.length ? (
        <div>
          <span className={lbl}>Log sets per exercise <span className="font-medium text-faint">(optional · own progression)</span></span>
          <div className="flex flex-col gap-2">
            {exercises.map((id) => {
              const v = exLogs[id] ?? { weight: "", reps: "" };
              const setV = (patch: Partial<{ weight: string; reps: string }>) => setExLogs((p) => ({ ...p, [id]: { ...v, ...patch } }));
              return (
                <div key={id} className="flex items-center gap-2 rounded-xl border border-line bg-surface2 px-2.5 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{exerciseName(id)}</span>
                  <input className="w-14 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent" inputMode="numeric" placeholder="lb" value={v.weight} onChange={(e) => setV({ weight: e.target.value })} />
                  <span className="text-faint">×</span>
                  <input className="w-20 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent" inputMode="numeric" placeholder="10/10/8" value={v.reps} onChange={(e) => setV({ reps: e.target.value })} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* recovery focus */}
      {tracker === "recovery" ? (
        <div><span className={lbl}>Focus</span><Chips options={RECOVERY_FOCUS} value={focuses} onToggle={tog(setFocuses)} /></div>
      ) : null}

      {/* duration + cardio metrics */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={lbl}>Duration (min)</span><input className={inputCls} type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
        {tracker === "cardio" ? (
          <label className="block"><span className={lbl}>Distance (mi)</span><input className={inputCls} type="number" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} /></label>
        ) : null}
      </div>

      {tracker === "cardio" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={lbl}>Pace (optional)</span><input className={inputCls} value={pace} placeholder="9:30 /mi" onChange={(e) => setPace(e.target.value)} /></label>
          <label className="block"><span className={lbl}>Avg HR (optional)</span><input className={inputCls} type="number" inputMode="numeric" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} /></label>
        </div>
      ) : null}

      {/* combat rounds */}
      {tracker === "combat" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={lbl}>Rounds</span><input className={inputCls} type="number" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value)} /></label>
          <label className="block"><span className={lbl}>Round length (min)</span><input className={inputCls} type="number" inputMode="decimal" value={roundLen} onChange={(e) => setRoundLen(e.target.value)} /></label>
          <button onClick={() => setSparring((v) => !v)} className={`col-span-2 flex min-h-[44px] items-center justify-between rounded-xl border px-3 text-sm font-semibold ${sparring ? "border-accent bg-accent/15 text-accent" : "border-line text-muted"}`}>
            <span>Sparring</span><span>{sparring ? "✓ yes" : "no"}</span>
          </button>
        </div>
      ) : null}

      {/* intensity / effort */}
      <div>
        <span className={lbl}>{tracker === "cardio" ? "Perceived effort" : "Intensity"}</span>
        <Segmented options={INTENSITY} value={intensity} onChange={setIntensity} columns={4} />
      </div>

      {/* skill focus for combat / strength */}
      {(tracker === "combat" || tracker === "free-weight") ? (
        <label className="block"><span className={lbl}>Skill focus (optional)</span><input className={inputCls} value={skillFocus} placeholder={tracker === "combat" ? "guard, clinch…" : "tempo, depth…"} onChange={(e) => setSkillFocus(e.target.value)} /></label>
      ) : null}

      {/* route notes for cardio */}
      {tracker === "cardio" ? (
        <label className="block"><span className={lbl}>Route / location (optional)</span><input className={inputCls} value={routeNotes} placeholder="park loop, treadmill…" onChange={(e) => setRouteNotes(e.target.value)} /></label>
      ) : null}

      {/* soreness */}
      <div>
        <span className={lbl}>Soreness / pain</span>
        <Segmented options={SORENESS} value={soreness} onChange={setSoreness} columns={4} />
      </div>

      <label className="block"><span className={lbl}>Notes</span><textarea className={`${inputCls} min-h-[60px] py-2`} value={notes} placeholder="How did it go?" onChange={(e) => setNotes(e.target.value)} /></label>

      <button onClick={save} className="tap min-h-[52px] w-full rounded-xl bg-accent text-base font-bold text-accent-ink active:scale-[0.99]">Log {ACTIVITY_LABEL[activity]}</button>

      {recent.length ? (
        <div>
          <div className="mb-2 px-1 text-sm font-bold">Recent</div>
          <div className="flex flex-col gap-2">
            {recent.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{ACTIVITY_LABEL[l.activity]}{l.subType ? ` · ${l.subType}` : ""}</div>
                  {l.exercises?.length ? <div className="truncate text-[11px] text-muted">{l.exercises.map((id) => exerciseName(id)).join(", ")}</div> : null}
                  <div className="truncate text-[11px] text-faint">
                    {relDate(l.date)}
                    {l.durationMin ? ` · ${l.durationMin} min` : ""}
                    {l.intensity ? ` · ${l.intensity}` : ""}
                    {l.locationName ? ` · ${l.locationName}` : ""}
                  </div>
                </div>
                <button aria-label="delete log" className="px-2 text-faint active:text-bad" onClick={() => deleteActivityLog(l.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
