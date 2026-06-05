"use client";

import type { Machine } from "@/lib/types";
import { useStore } from "@/lib/store";
import { exerciseName } from "@/lib/exercises";
import { lastLogForKey } from "@/lib/analytics";
import { progressionKey } from "@/lib/progression";
import { isMultiExercise } from "@/lib/catalog";
import Sheet from "./Sheet";
import PhotoTile from "./PhotoTile";

/** Multi-exercise station step: "What are you doing here?" → pick an exercise so the
 *  logger opens with that exercise's own history. */
export default function ExerciseChooser({ machine, onPick, onClose }: { machine: Machine; onPick: (e: { id: string; name: string }) => void; onClose: () => void }) {
  const { data } = useStore();
  const ids = machine.exercises ?? [];

  return (
    <Sheet open onClose={onClose} title="What are you doing here?">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
          <PhotoTile machine={machine} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-extrabold">{machine.name}</div>
          <div className="text-[11px] text-faint">Pick the exercise — each keeps its own weight &amp; progression.</div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {ids.map((id) => {
          const name = exerciseName(id);
          const key = progressionKey({ machineId: machine.id, exerciseId: id, multiExercise: isMultiExercise(machine) });
          const last = lastLogForKey(data.logs, key);
          const reps = last?.sets.filter((r) => r > 0).join("/");
          return (
            <button key={id} onClick={() => onPick({ id, name })} className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3.5 py-3 text-left active:bg-surface3">
              <span className="font-bold">{name}</span>
              <span className="text-[11px] tabular-nums text-faint">{last ? `last ${last.weight}${reps ? ` × ${reps}` : ""}` : "no history"}</span>
            </button>
          );
        })}
        {ids.length === 0 ? <div className="rounded-xl bg-surface2 p-3 text-sm text-faint">No exercises tagged on this station yet — add some from its detail in the Machines tab.</div> : null}
      </div>
    </Sheet>
  );
}
