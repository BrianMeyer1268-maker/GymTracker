"use client";

import { useStore } from "@/lib/store";
import { buildPlan } from "@/lib/navigator";
import { findMachine } from "@/lib/catalog";
import { sessionScore, priorBestScore, bestReps, suggestGoal } from "@/lib/analytics";
import { GOAL_LABEL } from "@/lib/movement";
import { sessionDurationMs, paceBaseline, paceAlerts } from "@/lib/timing";
import { todayISO, fmtDuration } from "@/lib/date";

export default function WorkoutSummary({ onEnd, onResume }: { onEnd: () => void; onResume?: () => void }) {
  const { data } = useStore();
  const goal = data.today?.goal;
  const date = todayISO();
  const todayLogs = data.logs.filter((l) => l.date === date && (!goal || l.goal === goal));
  const session = data.sessions.find((s) => s.id === data.today?.sessionId);
  const durationMs = session ? sessionDurationMs(session) : 0;

  const volume = todayLogs.reduce((sum, l) => sum + l.weight * l.sets.reduce((a, b) => a + b, 0), 0);

  const items = todayLogs.map((l) => {
    const machine = findMachine(data.machines, l.machineId);
    const prior = machine ? priorBestScore(machine, data.logs, date) : -Infinity;
    const progressed = machine ? sessionScore(machine, l) > prior && prior > -Infinity : false;
    const isNew = prior === -Infinity;
    return { log: l, name: machine?.name ?? "Exercise", progressed, isNew, pain: l.pain };
  });
  const progressed = items.filter((i) => i.progressed);
  const painItems = items.filter((i) => i.pain !== "none");

  const paceItems = todayLogs
    .map((l) => {
      const m = findMachine(data.machines, l.machineId);
      const alerts = paceAlerts(l, paceBaseline(data.logs, l.machineId, l.id));
      return { id: l.id, name: m?.name ?? "Exercise", notes: alerts.notes, rushing: alerts.rushing };
    })
    .filter((p) => p.notes.length > 0);

  const plan = buildPlan(data);
  const skippedLabels = plan ? plan.slots.filter((s) => s.status === "skipped").map((s) => s.label) : [];

  const next = suggestGoal(data.logs, undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 text-center">
        <div className="text-3xl">💪</div>
        <div className="mt-1 text-xl font-extrabold">Workout summary</div>
        <div className="mt-1 text-sm text-muted">
          {goal ? GOAL_LABEL[goal] + " · " : ""}
          {todayLogs.length} exercise{todayLogs.length === 1 ? "" : "s"}
          {durationMs > 0 ? ` · ${fmtDuration(durationMs)}` : ""}
        </div>
        {session ? (
          <div className="mt-1 text-xs text-faint">
            {session.busyCount} busy · {session.subCount} subs · {session.skipCount} skipped{session.crowd ? ` · ${session.crowd} gym` : ""}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3.5">
          <div className="text-xs text-muted">Exercises</div>
          <div className="text-2xl font-extrabold tabular-nums">{todayLogs.length}</div>
        </div>
        <div className="card p-3.5">
          <div className="text-xs text-muted">Volume</div>
          <div className="text-2xl font-extrabold tabular-nums">
            {Math.round(volume).toLocaleString()} <span className="text-xs font-semibold text-faint">lb</span>
          </div>
        </div>
      </div>

      {/* Completed */}
      <div className="card p-4">
        <div className="mb-1 text-sm font-bold">Completed</div>
        {items.length === 0 ? (
          <div className="py-2 text-sm text-faint">Nothing logged.</div>
        ) : (
          items.map((i) => (
            <div key={i.log.id} className="flex items-center gap-2 border-b border-line/60 py-2 last:border-0">
              <span className="flex-1 truncate text-sm font-semibold">{i.name}</span>
              <span className="text-xs tabular-nums text-faint">{i.log.weight} · {i.log.sets.filter((r) => r > 0).join("/")}</span>
              {i.progressed ? <span className="chip bg-good/15 text-good">↑ PR</span> : i.isNew ? <span className="chip bg-surface3 text-muted">new</span> : null}
            </div>
          ))
        )}
      </div>

      {/* Progress / PRs */}
      {progressed.length > 0 ? (
        <div className="card border-good/30 bg-good/5 p-4">
          <div className="mb-1 text-sm font-bold text-good">📈 Progress</div>
          {progressed.map((i) => (
            <div key={i.log.id} className="py-1 text-sm">
              <b>{i.name}</b> <span className="text-muted">— beat your previous best ({i.log.weight} × {bestReps(i.log.sets)})</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Pain flags */}
      {painItems.length > 0 ? (
        <div className="card border-bad/30 bg-bad/5 p-4">
          <div className="mb-1 text-sm font-bold text-bad">⚑ Pain flagged</div>
          {painItems.map((i) => (
            <div key={i.log.id} className="py-1 text-sm">
              <b>{i.name}</b> <span className="text-muted">— {i.pain} pain. Eased off next time.</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Pace notes */}
      {paceItems.length > 0 ? (
        <div className="card p-4">
          <div className="mb-1 text-sm font-bold">⚡ Pace notes</div>
          {paceItems.map((p) => (
            <div key={p.id} className="border-b border-line/40 py-1.5 text-[13px] last:border-0">
              <span className="font-bold">{p.name}</span> {p.rushing ? <span className="chip bg-warn/15 text-warn">rushed</span> : null}
              <div className="text-muted">{p.notes.join(" ")}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Skipped */}
      {skippedLabels.length > 0 ? (
        <div className="card p-4">
          <div className="mb-1 text-sm font-bold">⤼ Skipped</div>
          <div className="text-sm text-muted">{skippedLabels.join(" · ")}</div>
        </div>
      ) : null}

      {/* Suggested next */}
      <div className="card p-4">
        <div className="text-xs text-muted">Suggested next workout</div>
        <div className="text-lg font-extrabold">{GOAL_LABEL[next]}</div>
      </div>

      <button className="tap min-h-[52px] w-full rounded-xl bg-accent font-bold text-accent-ink active:scale-[0.99]" onClick={onEnd}>
        End workout
      </button>
      {onResume ? (
        <button className="tap min-h-[44px] w-full text-sm font-semibold text-muted active:text-ink" onClick={onResume}>
          Not done — keep going
        </button>
      ) : null}
    </div>
  );
}
