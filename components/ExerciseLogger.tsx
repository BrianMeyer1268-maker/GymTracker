"use client";

import { useRef, useState } from "react";
import type { Difficulty, LogTiming, Machine, Pain, SwitchReason, WorkoutGoal } from "@/lib/types";
import { useStore } from "@/lib/store";
import { lastLogFor } from "@/lib/analytics";
import { recommend } from "@/lib/progression";
import { EQUIPMENT_LABEL } from "@/lib/movement";
import { restDefaultFor, paceBaseline } from "@/lib/timing";
import { relDate } from "@/lib/date";
import { downscaleImage } from "@/lib/photos";
import Sheet from "./Sheet";
import Segmented from "./Segmented";
import Stepper from "./Stepper";
import PhotoTile from "./PhotoTile";
import RestTimer from "./RestTimer";

const DIFF: { value: Difficulty; label: string; selectedClass: string }[] = [
  { value: "easy", label: "Easy", selectedClass: "bg-good/20 border-good text-good" },
  { value: "right", label: "Right", selectedClass: "bg-accent/20 border-accent text-accent" },
  { value: "hard", label: "Hard", selectedClass: "bg-warn/20 border-warn text-warn" },
];
const PAIN: { value: Pain; label: string; selectedClass: string }[] = [
  { value: "none", label: "None", selectedClass: "bg-good/20 border-good text-good" },
  { value: "minor", label: "Minor", selectedClass: "bg-warn/20 border-warn text-warn" },
  { value: "significant", label: "Significant", selectedClass: "bg-bad/20 border-bad text-bad" },
];

function clampReps(n: number) {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(99, n));
}
function parseReps(text: string): number[] {
  return text.split(/[^\d]+/).map((s) => parseInt(s, 10)).filter((n) => n > 0 && n < 100);
}

export default function ExerciseLogger({
  machine,
  goal,
  onClose,
  onLeave,
  showToast,
}: {
  machine: Machine;
  goal: WorkoutGoal;
  onClose: () => void;
  onLeave: (reason: SwitchReason) => void;
  showToast: (m: string) => void;
}) {
  const { data, saveExercise, setGymPhoto } = useStore();
  const last = lastLogFor(data.logs, machine.id);
  const rec = recommend(machine, last, data.phase, data.flagged.includes(machine.id));
  const baseline = paceBaseline(data.logs, machine.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const openedAtRef = useRef(Date.now());
  const firstSetRef = useRef<number | undefined>(undefined);

  const initWeight = rec.suggestedWeight ?? last?.weight ?? machine.usualWeight ?? machine.startingWeight ?? 0;
  const initSets = last && last.sets.length ? last.sets.slice(0, 4) : [rec.target[0] || 8, rec.target[0] || 8, rec.target[0] || 8];
  while (initSets.length < 3) initSets.push(rec.target[0] || 8);

  const [weight, setWeight] = useState(initWeight);
  const [sets, setSets] = useState<number[]>(initSets);
  const [repsText, setRepsText] = useState(initSets.join("/"));
  const [difficulty, setDifficulty] = useState<Difficulty>("right");
  const [pain, setPain] = useState<Pain>("none");
  const [quick, setQuick] = useState(false);

  const restDefault = restDefaultFor(machine);
  const [rests, setRests] = useState<number[]>([]);
  const [restOpen, setRestOpen] = useState(false);
  const [restTarget, setRestTarget] = useState(restDefault || 90);

  const isCardio = machine.progression === "cardio";
  const step = machine.smallestJump && machine.smallestJump > 0 ? machine.smallestJump : 5;
  const adjust = (d: number) => setWeight((w) => Math.max(0, Math.min(2000, w + d)));

  function openRest(n: number) {
    if (firstSetRef.current === undefined) firstSetRef.current = Date.now();
    setRestTarget(n);
    setRestOpen(true);
  }

  const restAvg = rests.length ? rests.reduce((a, b) => a + b, 0) / rests.length : 0;
  const restShort = !!baseline && restAvg > 0 && baseline.avgRestSec > 0 && restAvg < 0.75 * baseline.avgRestSec;

  const setup = machine.setup ?? {};
  const setupRows: [string, string | undefined][] = [["Seat", setup.seat], ["Handle", setup.handle], ["Pad", setup.pad], ["Start", setup.start]];
  const hasSetup = setupRows.some(([, v]) => v) || setup.formCue || machine.settingsNotes;

  async function onPhoto(file: File) {
    try {
      setGymPhoto(machine.id, await downscaleImage(file));
      showToast("Gym photo saved ✓");
    } catch {
      showToast("Couldn't read that photo");
    }
  }

  function save() {
    const clean = (quick ? parseReps(repsText) : sets.map(clampReps)).filter((r) => r > 0);
    if (!isCardio && clean.length === 0) {
      showToast("Add at least one set");
      return;
    }
    const savedAt = Date.now();
    const restTotalSec = rests.reduce((a, b) => a + b, 0);
    const setCount = clean.length;
    const activeMs = savedAt - openedAtRef.current;
    const timing: LogTiming = {
      openedAt: openedAtRef.current,
      firstSetAt: firstSetRef.current,
      savedAt,
      activeMs,
      restTotalSec,
      setCount,
      avgRestSec: rests.length ? Math.round(restTotalSec / rests.length) : 0,
      timePerSetMs: setCount ? Math.round(activeMs / setCount) : 0,
    };
    saveExercise({ machineId: machine.id, category: machine.category, goal, weight, sets: isCardio ? [] : clean, difficulty, pain, restsSec: rests.length ? rests : undefined, timing });
    showToast(`${machine.name} logged ✓`);
    onClose();
  }

  const toneBorder = rec.tone === "up" ? "border-good/40" : rec.tone === "down" ? "border-warn/40" : "border-accent/30";
  const toneText = rec.tone === "up" ? "text-good" : rec.tone === "down" ? "text-warn" : "text-accent";

  return (
    <Sheet
      open
      onClose={onClose}
      title={machine.name}
      footer={restOpen ? undefined : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2">
            <button className="tap min-h-[46px] rounded-xl border border-line bg-surface2 text-[13px] font-bold text-warn active:bg-surface3" onClick={() => onLeave("busy")}>
              Busy
            </button>
            <button className="tap min-h-[46px] rounded-xl border border-line bg-surface2 text-[13px] font-bold text-muted active:bg-surface3" onClick={() => onLeave("not-working")}>
              Broken
            </button>
            <button className="tap min-h-[46px] rounded-xl border border-line bg-surface2 text-[13px] font-bold text-bad active:bg-surface3" onClick={() => onLeave("pain")}>
              Pain
            </button>
            <button className="tap min-h-[46px] rounded-xl border border-line bg-surface2 text-[13px] font-bold text-accent active:bg-surface3" onClick={() => onLeave("substitute")}>
              Swap
            </button>
          </div>
          <button className="tap min-h-[56px] w-full rounded-xl bg-accent text-lg font-extrabold text-accent-ink active:scale-[0.99]" onClick={save}>
            Save &amp; choose next →
          </button>
        </div>
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
          <PhotoTile machine={machine} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            {EQUIPMENT_LABEL[machine.equipment]}
            {machine.rating === "favorite" ? <span className="text-warn">★</span> : null}
            {machine.trainer ? <span className="chip bg-accent/15 text-accent">trainer</span> : null}
          </div>
          <div className="truncate text-[11px] text-faint">{machine.primaryMuscles.join(", ")}</div>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-line text-xs font-bold">
          <button className={`px-2.5 py-1.5 ${!quick ? "bg-accent text-accent-ink" : "text-muted"}`} onClick={() => setQuick(false)}>
            Full
          </button>
          <button className={`px-2.5 py-1.5 ${quick ? "bg-accent text-accent-ink" : "text-muted"}`} onClick={() => setQuick(true)}>
            ⚡ Quick
          </button>
        </div>
      </div>

      {!machine.gymPhotoId ? (
        <button className="mt-2 w-full rounded-lg border border-dashed border-line py-2 text-xs font-semibold text-faint active:bg-surface2" onClick={() => fileRef.current?.click()}>
          📷 Add a real photo of this machine <span className="text-faint/70">· optional, take it later</span>
        </button>
      ) : null}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />

      {!last && !isCardio ? (
        <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <span className="font-bold text-accent">🎯 Set baseline today.</span>{" "}
          <span className="text-muted">Pick a weight you can control for {rec.targetLabel} clean reps — we&apos;ll progress from here.</span>
        </div>
      ) : null}

      {hasSetup ? (
        <div className="mt-3 rounded-xl border border-line bg-surface2 p-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">⚙ Setup</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {setupRows.map(([k, v]) => (v ? <span key={k}><span className="text-muted">{k}:</span> <b>{v}</b></span> : null))}
            {machine.settingsNotes ? <span className="text-muted">{machine.settingsNotes}</span> : null}
          </div>
          {setup.formCue ? <div className="mt-1.5 text-[13px] text-accent">💡 {setup.formCue}</div> : null}
        </div>
      ) : null}

      <div className={`mt-3 rounded-xl border ${toneBorder} bg-surface2 p-3`}>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Last time</span>
          <span className="text-sm font-bold tabular-nums">{rec.lastText ? `${rec.lastText}${last ? " · " + relDate(last.date) : ""}` : "No history yet"}</span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Target today</span>
          <span className={`text-base font-extrabold tabular-nums ${toneText}`}>{rec.targetText}</span>
        </div>
        <div className="mt-1.5 border-t border-line pt-1.5 text-[12.5px] leading-snug text-muted">
          <span className="font-semibold text-ink">Why:</span> {rec.reason}
        </div>
      </div>

      {/* Weight + quick adjust */}
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{machine.inverted ? "Assist weight" : "Weight"}</div>
        <Stepper value={weight} onChange={setWeight} step={step} unit="lb" ariaLabel="weight" />
        {!isCardio ? (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[-10, -5, 5, 10].map((d) => (
              <button key={d} className="tap min-h-[40px] rounded-lg border border-line bg-surface2 text-sm font-bold text-muted active:bg-surface3" onClick={() => adjust(d)}>
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Sets */}
      {!isCardio ? (
        quick ? (
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Reps (type it, e.g. 10/10/8)</div>
            <input className="bignum min-h-[54px] w-full px-3 text-left" inputMode="numeric" value={repsText} onFocus={(e) => e.target.select()} onChange={(e) => setRepsText(e.target.value)} placeholder="10/10/8" />
          </div>
        ) : (
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Reps per set</div>
            <div className="flex gap-2">
              {sets.map((r, i) => {
                const cls = r >= rec.target[1] ? "text-good" : r > 0 && r < rec.target[0] ? "text-warn" : "";
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-faint">SET {i + 1}</span>
                    <input className={`bignum min-h-[54px] w-full ${cls}`} type="number" inputMode="numeric" value={r} onFocus={(e) => e.target.select()} onChange={(e) => setSets((s) => s.map((x, j) => (j === i ? clampReps(parseInt(e.target.value, 10)) : x)))} />
                    <div className="flex w-full gap-1">
                      <button className="tap flex-1 rounded-lg border border-line bg-surface2 py-1.5 text-base font-bold text-muted active:bg-surface3" onClick={() => setSets((s) => s.map((x, j) => (j === i ? clampReps(x - 1) : x)))}>
                        −
                      </button>
                      <button className="tap flex-1 rounded-lg border border-line bg-surface2 py-1.5 text-base font-bold text-muted active:bg-surface3" onClick={() => setSets((s) => s.map((x, j) => (j === i ? clampReps(x + 1) : x)))}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5">
              {sets.length < 4 ? (
                <button className="rounded-lg border border-dashed border-line px-3 py-2 text-xs font-semibold text-muted" onClick={() => setSets((s) => [...s, s[s.length - 1] ?? rec.target[0]])}>
                  + Add set {sets.length + 1}
                </button>
              ) : (
                <button className="px-2 py-1 text-xs text-faint" onClick={() => setSets((s) => s.slice(0, -1))}>
                  Remove set 4
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <p className="mt-4 rounded-xl bg-surface2 p-3 text-sm text-muted">Cardio — put minutes in the weight field, or just mark it done.</p>
      )}

      {/* Rest timer — tap a duration to start the docked countdown */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">⏱ Rest</span>
          {rests.length > 0 ? <span className="text-[11px] tabular-nums text-faint">used {rests.map((r) => `${r}s`).join(", ")}</span> : null}
        </div>
        <div className="flex gap-2">
          {[45, 60, 90, 120, 180].map((n) => (
            <button
              key={n}
              className={`tap min-h-[46px] flex-1 rounded-xl border text-sm font-bold active:bg-surface3 ${n === (restDefault || 90) ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface2 text-muted"}`}
              onClick={() => openRest(n)}
            >
              {n}s
            </button>
          ))}
        </div>
        {baseline ? (
          <div className="mt-1.5 text-[11px] tabular-nums text-faint">
            Usual here ~{Math.round((baseline.avgActiveMs / 60000) * 10) / 10} min · {Math.round(baseline.avgRestSec)}s rest
            {restShort ? <span className="text-warn"> · resting short</span> : null}
          </div>
        ) : null}
      </div>

      {/* Difficulty */}
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">How did it feel?</div>
        <Segmented options={DIFF} value={difficulty} onChange={setDifficulty} />
      </div>

      {/* Pain */}
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Pain</div>
        <Segmented options={PAIN} value={pain} onChange={setPain} />
      </div>

      {restOpen ? (
        <RestTimer
          key={restTarget}
          seconds={restTarget}
          onClose={(used) => {
            setRestOpen(false);
            if (used >= 5) setRests((r) => [...r, used]);
          }}
        />
      ) : null}
    </Sheet>
  );
}
