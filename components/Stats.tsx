"use client";

import { useRef } from "react";
import type { WorkoutGoal } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  improvingExercises,
  stalledExercises,
  newBaselineExercises,
  weeklyCount,
  lastWorkoutDate,
  suggestGoal,
  bestReps,
  type TrendItem,
} from "@/lib/analytics";
import { sortedBodyComp } from "@/lib/bodyComp";
import { GOAL_ICON, GOAL_LABEL } from "@/lib/movement";
import { relDate, todayISO, toISO, parseISO } from "@/lib/date";
import { exportData } from "@/lib/storage";

function last7(dates: Set<string>): boolean[] {
  const today = parseISO(todayISO());
  const out: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(dates.has(toISO(d)));
  }
  return out;
}

function change(t: TrendItem): string {
  if (!t.prev) return "new";
  const dw = t.last.weight - t.prev.weight;
  if (dw !== 0) return `${dw > 0 ? "+" : ""}${Math.round(dw * 10) / 10} lb`;
  const dr = bestReps(t.last.sets) - bestReps(t.prev.sets);
  if (dr !== 0) return `${dr > 0 ? "+" : ""}${dr} rep`;
  return "same";
}

export default function Stats({ onStartGoal, showToast }: { onStartGoal: (g: WorkoutGoal) => void; showToast: (m: string) => void }) {
  const { data, importBackup } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const latest = sortedBodyComp(data.bodyComp).slice(-1)[0];
  const improving = improvingExercises(data.logs, data.machines);
  const stalled = stalledExercises(data.logs, data.machines);
  const fresh = newBaselineExercises(data.logs, data.machines);
  const week = weeklyCount(data.logs);
  const lastWk = lastWorkoutDate(data.logs);
  const next = suggestGoal(data.logs, undefined);
  const dots = last7(new Set(data.logs.map((l) => l.date)));

  async function onFile(file: File) {
    try {
      const text = await file.text();
      if (typeof window !== "undefined" && !window.confirm("Replace all current data with this backup?")) return;
      importBackup(text);
      showToast("Backup imported ✓");
    } catch {
      showToast("Couldn't read that backup file");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">Dashboard</div>
        <h1 className="text-2xl font-extrabold leading-tight">Stats</h1>
      </header>

      {/* Current composition */}
      <div className="card p-3.5">
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">Weight</div>
            <div className="text-xl font-extrabold tabular-nums">{latest?.weight ?? "—"}<span className="text-xs text-muted"> lb</span></div>
          </div>
          <div className="flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">Body Fat</div>
            <div className="text-xl font-extrabold tabular-nums">{latest?.bodyFat ?? "—"}<span className="text-xs text-muted"> %</span></div>
          </div>
          <div className="flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">Muscle</div>
            <div className="text-xl font-extrabold tabular-nums">{latest?.skeletalMuscle ?? "—"}<span className="text-xs text-muted"> lb</span></div>
          </div>
        </div>
      </div>

      {/* Suggested next */}
      <button
        className="card flex items-center gap-3 p-4 text-left active:scale-[0.99]"
        onClick={() => onStartGoal(next)}
      >
        <span className="text-3xl">{GOAL_ICON[next]}</span>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Suggested next workout</div>
          <div className="text-xl font-extrabold">{GOAL_LABEL[next]} →</div>
        </div>
      </button>

      {/* This week */}
      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-bold">This week</div>
          <div className="text-sm text-muted">
            last workout <span className="font-semibold text-ink">{lastWk ? relDate(lastWk) : "—"}</span>
          </div>
        </div>
        <div className="mt-1 text-3xl font-extrabold tabular-nums">
          {week} <span className="text-sm font-semibold text-faint">/ 7 days</span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {dots.map((on, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full ${on ? "bg-good" : "bg-surface3"}`} />
          ))}
        </div>
      </div>

      {/* Improving */}
      <div className="card p-4">
        <div className="mb-1 text-sm font-bold">📈 Improving</div>
        {improving.length === 0 ? (
          <div className="py-3 text-center text-sm text-faint">Log a movement twice to see progress.</div>
        ) : (
          improving.map((t) => (
            <div key={t.key} className="flex items-center gap-2 border-b border-line/60 py-2.5 last:border-0">
              <span className="flex-1 text-sm font-semibold">{t.label}</span>
              <span className="text-xs tabular-nums text-faint">{t.last.weight} · {bestReps(t.last.sets)}r</span>
              <span className="text-xs font-bold tabular-nums text-good">▲ {change(t)}</span>
            </div>
          ))
        )}
      </div>

      {/* Stalled */}
      <div className="card p-4">
        <div className="mb-1 text-sm font-bold">⏸️ Stalled / holding</div>
        {stalled.length === 0 ? (
          <div className="py-3 text-center text-sm text-faint">Nothing stalled. Keep it up.</div>
        ) : (
          stalled.map((t) => (
            <div key={t.key} className="flex items-center gap-2 border-b border-line/60 py-2.5 last:border-0">
              <span className="flex-1 text-sm font-semibold">{t.label}</span>
              <span className="text-xs tabular-nums text-faint">{t.last.weight} · {bestReps(t.last.sets)}r</span>
              <span className="text-xs font-bold tabular-nums text-faint">■ {change(t)}</span>
            </div>
          ))
        )}
      </div>

      {/* New baselines */}
      {fresh.length ? (
        <div className="card p-4">
          <div className="mb-1 text-sm font-bold">🆕 New baseline</div>
          {fresh.map((t) => (
            <div key={t.key} className="flex items-center gap-2 border-b border-line/60 py-2.5 last:border-0">
              <span className="flex-1 text-sm font-semibold">{t.label}</span>
              <span className="text-xs tabular-nums text-faint">{t.last.weight} · {bestReps(t.last.sets)}r</span>
              <span className="text-xs font-bold tabular-nums text-accent">new</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Backup */}
      <div className="card p-4">
        <div className="mb-1 text-sm font-bold">💾 Backup</div>
        <p className="mb-3 text-xs text-faint">Data + photos live on this device only. Export a JSON backup or import one to restore.</p>
        <div className="flex gap-3">
          <button className="min-h-[48px] flex-1 rounded-xl border border-line font-semibold active:bg-surface2" onClick={() => exportData(data)}>
            Export
          </button>
          <button className="min-h-[48px] flex-1 rounded-xl border border-line font-semibold active:bg-surface2" onClick={() => fileRef.current?.click()}>
            Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
