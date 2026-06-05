"use client";

import { useState } from "react";
import { EXERCISE_GROUPS, exercisesByGroup, exerciseName, type ExerciseGroup } from "@/lib/exercises";

/** Pick exercises grouped by equipment/system. `value` holds exercise ids (or raw
 *  custom names). Reused by the free-weight / bodyweight trackers and cable machines. */
export default function ExercisePicker({
  groups,
  value,
  onChange,
  allowCustom = true,
}: {
  groups: ExerciseGroup[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
}) {
  const [active, setActive] = useState<ExerciseGroup>(groups[0]);
  const [custom, setCustom] = useState("");

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const addCustom = () => {
    const t = custom.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setCustom("");
  };
  const groupMeta = (g: ExerciseGroup) => EXERCISE_GROUPS.find((x) => x.id === g)!;

  return (
    <div className="flex flex-col gap-2.5">
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
              {exerciseName(id)}
              <button aria-label={`remove ${exerciseName(id)}`} onClick={() => toggle(id)} className="text-accent/70 active:text-accent">✕</button>
            </span>
          ))}
        </div>
      ) : null}

      {groups.length > 1 ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {groups.map((g) => {
            const m = groupMeta(g);
            return (
              <button key={g} onClick={() => setActive(g)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${active === g ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface2 text-muted"}`}>
                {m.icon} {m.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {exercisesByGroup(active).map((e) => {
          const on = value.includes(e.id);
          return (
            <button key={e.id} onClick={() => toggle(e.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface2 text-muted"}`}>
              {e.name}
            </button>
          );
        })}
      </div>

      {allowCustom ? (
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
            placeholder={`Add a ${groupMeta(active).name} exercise`}
            className="min-h-[40px] flex-1 rounded-xl border border-line bg-surface2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button onClick={addCustom} className="shrink-0 rounded-xl border border-line px-3 text-sm font-semibold active:bg-surface2">Add</button>
        </div>
      ) : null}
    </div>
  );
}
