"use client";

import { useStore } from "@/lib/store";
import { GOAL_LABEL } from "@/lib/movement";
import {
  BUCKET_LABEL,
  bucketStats,
  paceSummaries,
  restByExercise,
  restByGoal,
  restInsights,
  rushingAlerts,
  scheduleSuggestion,
  validSessions,
  type ComboStat,
} from "@/lib/timing";
import { availabilityRanking, busyHeatmap, nowCtx } from "@/lib/prediction";
import type { TimeBucket } from "@/lib/types";

const BSHORT: Record<TimeBucket, string> = {
  "early-morning": "EM",
  morning: "AM",
  lunch: "Lu",
  afternoon: "PM",
  evening: "Ev",
  "late-night": "LN",
};
const BUCKETS: TimeBucket[] = ["early-morning", "morning", "lunch", "afternoon", "evening", "late-night"];

function heatCls(prob: number): string {
  if (prob < 0) return "bg-surface3";
  if (prob < 0.3) return "bg-good/50";
  if (prob < 0.6) return "bg-warn/50";
  return "bg-bad/60";
}
function comboText(c: ComboStat | undefined): string {
  if (!c) return "—";
  return c.label.charAt(0).toUpperCase() + c.label.slice(1);
}

export default function Timing() {
  const { data } = useStore();
  const total = validSessions(data.sessions).length;
  const sched = scheduleSuggestion(data.sessions);
  const buckets = bucketStats(data.sessions);
  const heat = busyHeatmap(data.observations, data.machines);
  const avail = availabilityRanking(data.observations, data.machines, nowCtx());
  const pace = paceSummaries(data.logs, data.machines).slice(0, 6);
  const rushing = rushingAlerts(data.logs, data.machines);
  const restEx = restByExercise(data.logs, data.machines).slice(0, 6);
  const restGoals = restByGoal(data.logs);
  const insights = restInsights(data.logs, data.machines);

  const hasObs = data.observations.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">Intelligence</div>
        <h1 className="text-2xl font-extrabold leading-tight">Timing</h1>
      </header>

      {total === 0 && !hasObs ? (
        <div className="card p-6 text-center text-sm text-muted">
          <div className="text-3xl">🕒</div>
          <div className="mt-2 font-bold text-ink">No timing data yet</div>
          <p className="mt-1 text-faint">Run a workout (and tap Available / Busy as you go). Your gym-traffic, availability and pace intelligence builds here.</p>
        </div>
      ) : null}

      {/* Schedule suggestion */}
      {total > 0 ? (
        <div className="card border-accent/30 bg-accent/5 p-4">
          <div className="mb-2 text-sm font-bold">📅 Schedule suggestion</div>
          {sched.enough ? (
            <div className="flex flex-col gap-2 text-sm">
              <Row label="🟢 Easiest" labelCls="text-good" value={comboText(sched.easiest)} sub={`${sched.easiest?.agg.avgBusy} busy avg`} />
              <Row label="🔴 Avoid" labelCls="text-warn" value={comboText(sched.busiest)} sub={`${sched.busiest?.agg.avgBusy} busy avg`} />
              <Row label="⚡ Fastest" labelCls="text-accent" value={comboText(sched.fastest)} sub={`${sched.fastest?.agg.avgDurMin} min avg`} />
            </div>
          ) : (
            <p className="text-sm text-muted">Log {2 - total} more session{2 - total === 1 ? "" : "s"} to unlock schedule suggestions.</p>
          )}
        </div>
      ) : null}

      {/* Best / avoid right now */}
      {avail.free.length > 0 || avail.busy.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3.5">
            <div className="mb-1 text-xs font-bold text-good">🟢 Free now</div>
            {avail.free.length === 0 ? <div className="text-[11px] text-faint">—</div> : avail.free.map((r) => (
              <div key={r.machine.id} className="truncate py-0.5 text-[12px]">{r.machine.name}</div>
            ))}
          </div>
          <div className="card p-3.5">
            <div className="mb-1 text-xs font-bold text-bad">🔴 Avoid now</div>
            {avail.busy.length === 0 ? <div className="text-[11px] text-faint">—</div> : avail.busy.map((r) => (
              <div key={r.machine.id} className="truncate py-0.5 text-[12px]">{r.machine.name}</div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Busy heatmap */}
      {heat.length > 0 ? (
        <div className="card p-4">
          <div className="mb-2 text-sm font-bold">🔥 Machine busy heatmap</div>
          <div className="mb-1 flex items-center gap-1 pl-[88px] text-[9px] font-bold uppercase text-faint">
            {BUCKETS.map((b) => (
              <span key={b} className="flex-1 text-center">{BSHORT[b]}</span>
            ))}
          </div>
          {heat.map((row) => (
            <div key={row.machine.id} className="flex items-center gap-1 py-0.5">
              <span className="w-[84px] shrink-0 truncate text-[11px] text-muted">{row.machine.name}</span>
              {row.cells.map((c) => (
                <span key={c.bucket} className={`h-4 flex-1 rounded ${heatCls(c.prob)}`} title={c.samples ? `${Math.round(c.prob * 100)}% busy` : "no data"} />
              ))}
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2 text-[10px] text-faint">
            <span className="h-3 w-3 rounded bg-good/50" /> free
            <span className="h-3 w-3 rounded bg-warn/50" /> sometimes
            <span className="h-3 w-3 rounded bg-bad/60" /> busy
            <span className="h-3 w-3 rounded bg-surface3" /> no data
          </div>
        </div>
      ) : null}

      {/* Gym traffic by time bucket */}
      {buckets.length > 0 ? (
        <div className="card p-4">
          <div className="mb-2 text-sm font-bold">🚦 Gym traffic by time</div>
          <div className="flex items-center gap-2 border-b border-line/60 pb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-faint">
            <span className="flex-1">When</span>
            <span className="w-10 text-right">Sess</span>
            <span className="w-10 text-right">Busy</span>
            <span className="w-10 text-right">Subs</span>
            <span className="w-12 text-right">Min</span>
          </div>
          {buckets.map((b) => (
            <div key={b.bucket} className="flex items-center gap-2 border-b border-line/40 py-2 text-sm last:border-0">
              <span className="flex-1 font-semibold">{BUCKET_LABEL[b.bucket]}</span>
              <span className="w-10 text-right tabular-nums text-muted">{b.agg.count}</span>
              <span className="w-10 text-right tabular-nums text-muted">{b.agg.avgBusy}</span>
              <span className="w-10 text-right tabular-nums text-muted">{b.agg.avgSub}</span>
              <span className="w-12 text-right tabular-nums text-muted">{b.agg.avgDurMin || "—"}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Rushing alerts */}
      {rushing.length > 0 ? (
        <div className="card border-warn/30 bg-warn/5 p-4">
          <div className="mb-1 text-sm font-bold text-warn">🏃 Rushing alerts</div>
          {rushing.map((t, i) => (
            <div key={i} className="border-b border-line/40 py-1.5 text-[13px] last:border-0">{t}</div>
          ))}
        </div>
      ) : null}

      {/* Pace insights */}
      {pace.length > 0 ? (
        <div className="card p-4">
          <div className="mb-2 text-sm font-bold">⚡ Pace insights</div>
          {pace.map((p) => (
            <div key={p.machine.id} className="flex items-center gap-2 border-b border-line/40 py-1.5 text-sm last:border-0">
              <span className="flex-1 truncate font-semibold">{p.machine.name}</span>
              <span className="text-[11px] tabular-nums text-faint">~{p.avgMin}m · {p.avgSets}set · {p.avgRest}s</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Rest insights */}
      <div className="card p-4">
        <div className="mb-2 text-sm font-bold">⏱ Rest insights</div>
        {insights.length === 0 && restEx.length === 0 ? (
          <p className="text-sm text-faint">Use the rest timer while logging to unlock rest insights.</p>
        ) : (
          <>
            {insights.map((t, i) => (
              <div key={i} className="mb-2 rounded-lg bg-warn/10 px-3 py-2 text-[13px] text-warn">{t}</div>
            ))}
            {restEx.length > 0 ? (
              <div className="mt-1">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-faint">Avg rest by exercise</div>
                {restEx.map((r) => (
                  <div key={r.machine.id} className="flex items-center gap-2 border-b border-line/40 py-1.5 text-sm last:border-0">
                    <span className="flex-1 truncate font-semibold">{r.machine.name}</span>
                    <span className="tabular-nums text-muted">{r.avgRest}s</span>
                  </div>
                ))}
              </div>
            ) : null}
            {restGoals.length > 0 ? (
              <div className="mt-3">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-faint">Avg rest by workout</div>
                <div className="flex flex-wrap gap-2">
                  {restGoals.map((g) => (
                    <span key={g.goal} className="chip bg-surface2 text-muted">{GOAL_LABEL[g.goal]}: {g.avgRest}s</span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, labelCls, value, sub }: { label: string; labelCls: string; value: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={labelCls}>{label}</span>
      <span className="flex-1 text-right font-semibold">
        {value} <span className="text-faint">· {sub}</span>
      </span>
    </div>
  );
}
