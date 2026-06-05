"use client";

import type { RankedMachine } from "@/lib/navigator";
import { CATEGORY_LABEL } from "@/lib/movement";
import { AVAIL_TEXT } from "@/lib/prediction";
import PhotoTile from "./PhotoTile";

const AVAIL_CLS = { free: "bg-good/15 text-good", sometimes: "bg-warn/15 text-warn", busy: "bg-bad/15 text-bad" } as const;

const TAG: Record<string, { label: string; cls: string } | null> = {
  best: { label: "★ Best next", cls: "bg-accent/15 text-accent" },
  substitute: { label: "Good substitute", cls: "bg-good/15 text-good" },
  used: { label: "Used today ✓", cls: "bg-surface3 text-muted" },
  busy: { label: "Busy last checked", cls: "bg-warn/15 text-warn" },
  option: null,
};

export default function MachineCard({
  ranked,
  onPick,
  onToggleBusy,
  onAddPhoto,
}: {
  ranked: RankedMachine;
  onPick: (id: string) => void;
  onToggleBusy: (id: string) => void;
  onAddPhoto?: (id: string) => void;
}) {
  const { machine, busy, usedToday, flagged, favorite, trainer, avoid, busyLabel, lastLog, tag } = ranked;
  const tagInfo = TAG[tag];
  const dim = busy || avoid ? "opacity-55" : "";

  return (
    <div className={`card relative overflow-hidden ${dim}`}>
      {onAddPhoto && !machine.gymPhotoId ? (
        <button
          className="tap absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-sm active:bg-black/70"
          aria-label={`add photo for ${machine.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onAddPhoto(machine.id);
          }}
        >
          📷
        </button>
      ) : null}

      <button className="tap flex w-full gap-3 p-3 text-left disabled:cursor-default" onClick={() => onPick(machine.id)} disabled={busy}>
        <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-line">
          <PhotoTile machine={machine} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {favorite ? <span className="text-warn" aria-label="favorite">★</span> : null}
            <span className="truncate text-base font-bold leading-tight">{machine.name}</span>
            {machine.needsNaming ? <span className="chip bg-warn/15 text-warn">name?</span> : null}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {CATEGORY_LABEL[machine.category]} · {machine.primaryMuscles.join(", ")}
          </div>
          {machine.brand ? <div className="truncate text-[11px] text-faint">{machine.brand}</div> : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {tagInfo ? <span className={`chip ${tagInfo.cls}`}>{tagInfo.label}</span> : null}
            {busyLabel && !busy ? <span className={`chip ${AVAIL_CLS[busyLabel]}`}>{AVAIL_TEXT[busyLabel]}</span> : null}
            {trainer ? <span className="chip bg-accent/15 text-accent">trainer</span> : null}
            {avoid ? <span className="chip bg-surface3 text-faint">avoid</span> : null}
            {flagged ? <span className="chip bg-bad/15 text-bad">⚑ pain</span> : null}
            {lastLog ? (
              <span className="text-[11px] text-faint">
                last {lastLog.weight} · {lastLog.sets.filter((r) => r > 0).join("/")}
              </span>
            ) : null}
          </div>
        </div>
        {!busy ? <span className="self-center text-xl text-faint">›</span> : null}
      </button>

      <div className="flex border-t border-line text-[15px] font-bold">
        <button className="tap flex-1 py-3 text-muted active:bg-surface2" onClick={() => onToggleBusy(machine.id)}>
          {busy ? "It's free now" : "Busy"}
        </button>
        <div className="w-px bg-line" />
        <button className="tap flex-[1.4] py-3 text-accent active:bg-surface2 disabled:text-faint" onClick={() => onPick(machine.id)} disabled={busy}>
          {usedToday ? "Log again" : "Log it →"}
        </button>
      </div>
    </div>
  );
}
