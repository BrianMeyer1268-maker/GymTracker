"use client";

import { useStore } from "@/lib/store";
import { mergeEvents, weekStats, recommend } from "@/lib/activity";
import { ACTIVITY_INTENSITIES } from "@/lib/types";

const INTENSITY_COLOR: Record<string, string> = {
  easy: "bg-good",
  moderate: "bg-accent",
  hard: "bg-warn",
  brutal: "bg-bad",
};

function Tile({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface2 px-2.5 py-2 text-center">
      <div className="text-lg font-extrabold tabular-nums leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">{label}{unit ? ` ${unit}` : ""}</div>
    </div>
  );
}

export default function ActivityDashboard() {
  const { data, activeProfile, activeLocation } = useStore();
  const events = mergeEvents(data.activityLogs, data.sessions);
  const wk = weekStats(events);
  const rec = recommend(events, { profileName: activeProfile?.name, location: activeLocation });
  const maxI = Math.max(1, ...ACTIVITY_INTENSITIES.map((i) => wk.intensity[i]));

  return (
    <div className="card flex flex-col gap-3 p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">This week</div>
        <div className="text-[11px] text-faint">{wk.totalSessions} sessions · {wk.activeDays}/7 days</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Tile label="Min" value={wk.totalMinutes} />
        <Tile label="Machine" value={wk.machineSessions} />
        <Tile label="Free wt" value={wk.freeWeightSessions} />
        <Tile label="Combat" value={wk.combatSessions} />
        <Tile label="Cardio" value={wk.cardioMinutes} unit="min" />
        <Tile label="Strength" value={wk.strengthSessions} />
        <Tile label="Recovery" value={wk.recoverySessions} />
        <Tile label="Rest days" value={Math.max(0, 7 - wk.activeDays)} />
      </div>

      {wk.totalSessions > 0 ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">Intensity</div>
          <div className="flex items-end gap-1.5">
            {ACTIVITY_INTENSITIES.map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-10 w-full items-end overflow-hidden rounded-md bg-surface3">
                  <div className={`w-full ${INTENSITY_COLOR[i]}`} style={{ height: `${(wk.intensity[i] / maxI) * 100}%` }} />
                </div>
                <span className="text-[9px] capitalize text-faint">{i}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {rec ? (
        <div className={`rounded-xl border px-3 py-2 text-[12.5px] font-medium ${rec.tone === "rest" ? "border-bad/40 bg-bad/10 text-bad" : rec.tone === "balance" ? "border-warn/40 bg-warn/10 text-warn" : "border-accent/40 bg-accent/10 text-accent"}`}>
          💡 {rec.text}
        </div>
      ) : null}
    </div>
  );
}
