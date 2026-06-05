"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { activeMachines } from "@/lib/catalog";
import Sheet from "./Sheet";
import PhotoTile from "./PhotoTile";
import MachineDetail from "./MachineDetail";

/** Map My Gym — browse machines by zone (picture-first) and pin them to a zone. */
export default function GymMap({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const { data, activeLocation, updateMachine } = useStore();
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [openMachine, setOpenMachine] = useState<string | null>(null);

  const zones = activeLocation?.zones ?? [];
  const floorId = activeLocation?.floors?.[0]?.id;
  const machines = activeMachines(data.machines);
  const knownZoneIds = new Set(zones.map((z) => z.id));
  const unplaced = machines.filter((m) => !m.zoneId || !knownZoneIds.has(m.zoneId));

  function assign(mid: string, zid: string) {
    updateMachine(mid, { zoneId: zid, floorId, locationNeedsReview: false });
    setAssignFor(null);
    showToast("Pinned to zone ✓");
  }

  const open = openMachine ? machines.find((m) => m.id === openMachine) : undefined;

  return (
    <Sheet open onClose={onClose} title={`🗺️ Map · ${activeLocation?.nickname || activeLocation?.name || "Gym"}`}>
      {zones.length === 0 ? <div className="rounded-xl bg-surface2 p-4 text-sm text-faint">This location has no zones yet. Add some to start mapping.</div> : null}

      {zones.map((z) => {
        const ms = machines.filter((m) => m.zoneId === z.id);
        return (
          <div key={z.id} className="mb-4">
            <div className="text-sm font-bold">{z.name} <span className="text-[11px] font-normal text-faint">· {ms.length}</span></div>
            {z.landmark ? <div className="mb-2 text-[11px] text-faint">📍 {z.landmark}</div> : <div className="mb-2" />}
            {ms.length ? (
              <div className="grid grid-cols-3 gap-2">
                {ms.map((m) => (
                  <button key={m.id} onClick={() => setOpenMachine(m.id)} className="overflow-hidden rounded-lg border border-line text-left active:opacity-90">
                    <div className="aspect-square w-full"><PhotoTile machine={m} /></div>
                    <div className="truncate px-1.5 py-1 text-[10px] font-semibold">{m.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-surface2 p-2 text-[11px] text-faint">No machines pinned here yet.</div>
            )}
          </div>
        );
      })}

      {unplaced.length ? (
        <div className="mb-2">
          <div className="mb-1.5 text-sm font-bold text-warn">Unplaced <span className="text-[11px] font-normal">· {unplaced.length}</span></div>
          <div className="flex flex-col gap-1.5">
            {unplaced.slice(0, 40).map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface2 p-1.5">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded"><PhotoTile machine={m} /></div>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{m.name}</span>
                <button onClick={() => setAssignFor(m.id)} className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">Pin →</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {assignFor ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setAssignFor(null)}>
          <div className="mx-auto w-full max-w-app rounded-t-2xl border-t border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-sm font-bold">Pin to zone</div>
            <div className="flex flex-col gap-2">
              {zones.map((z) => (
                <button key={z.id} onClick={() => assign(assignFor, z.id)} className="rounded-xl border border-line bg-surface2 px-3 py-2.5 text-left text-sm font-semibold active:bg-surface3">
                  {z.name}
                  {z.landmark ? <span className="ml-2 text-[11px] font-normal text-faint">{z.landmark}</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {open ? <MachineDetail machine={open} onClose={() => setOpenMachine(null)} showToast={showToast} /> : null}
    </Sheet>
  );
}
