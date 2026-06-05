"use client";

import { useRef, useState } from "react";
import type { Machine } from "@/lib/types";
import { useStore } from "@/lib/store";
import { findMachine, machinesForView, type CatalogView } from "@/lib/catalog";
import { lastLogFor } from "@/lib/analytics";
import { todayISO } from "@/lib/date";
import { CATEGORY_LABEL } from "@/lib/movement";
import { uid } from "@/lib/storage";
import { downscaleImage } from "@/lib/photos";
import PhotoTile from "./PhotoTile";
import MachineDetail from "./MachineDetail";
import GymScan from "./GymScan";

const VIEWS: { id: CatalogView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "hinge", label: "Hinge" },
  { id: "conditioning", label: "Conditioning" },
  { id: "needs-photo", label: "Needs Photo" },
  { id: "needs-naming", label: "Needs Naming" },
  { id: "favorites", label: "Favorites" },
  { id: "trainer", label: "Trainer Uses" },
];

/** Free-text match across name, brand/model and muscles. */
function matchesQuery(m: Machine, ql: string): boolean {
  return (
    m.name.toLowerCase().includes(ql) ||
    (m.brand ?? "").toLowerCase().includes(ql) ||
    (m.model ?? "").toLowerCase().includes(ql) ||
    CATEGORY_LABEL[m.category].toLowerCase().includes(ql) ||
    (m.primaryMuscles ?? []).some((mu) => mu.toLowerCase().includes(ql)) ||
    (m.secondaryMuscles ?? []).some((mu) => mu.toLowerCase().includes(ql))
  );
}

export default function MachineCatalog({ showToast }: { showToast: (m: string) => void }) {
  const { data, addMachine, setGymPhoto, restoreDefaultMachines } = useStore();
  const [view, setView] = useState<CatalogView>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<string | null>(null);

  const ql = q.trim().toLowerCase();
  const list = machinesForView(data.machines, view)
    .filter((m) => !ql || matchesQuery(m, ql))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const usedToday = new Set(data.logs.filter((l) => l.date === todayISO()).map((l) => l.machineId));

  function addNew() {
    const id = `custom-${uid()}`;
    addMachine({
      id,
      name: "New machine",
      category: "horizontal-push",
      equipment: "machine",
      progression: "machine",
      repTarget: [8, 12],
      startingWeight: 0,
      primaryMuscles: [],
      needsNaming: true,
      custom: true,
    });
    setSelectedId(id);
  }

  function openPhoto(id: string) {
    photoTarget.current = id;
    fileRef.current?.click();
  }

  function restore() {
    restoreDefaultMachines();
    setView("all");
    showToast("Default machines restored ✓");
  }

  async function onFile(file: File) {
    const id = photoTarget.current;
    if (!id) return;
    try {
      const dataUrl = await downscaleImage(file);
      setGymPhoto(id, dataUrl);
      showToast("Gym photo saved ✓");
    } catch {
      showToast("Couldn't read that photo");
    }
  }

  const counts: Partial<Record<CatalogView, number>> = {
    "needs-photo": machinesForView(data.machines, "needs-photo").length,
    "needs-naming": machinesForView(data.machines, "needs-naming").length,
    favorites: machinesForView(data.machines, "favorites").length,
  };

  const selected = selectedId ? findMachine(data.machines, selectedId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">Catalog</div>
          <h1 className="text-2xl font-extrabold leading-tight">Machines</h1>
        </div>
        <div className="flex gap-2">
          <button className="min-h-[44px] rounded-xl border border-accent/50 bg-accent/10 px-3 text-sm font-bold text-accent active:scale-95" onClick={() => setScanOpen(true)}>
            ✨ Scan
          </button>
          <button className="min-h-[44px] rounded-xl bg-accent px-4 text-sm font-bold text-accent-ink active:scale-95" onClick={addNew}>
            + Add
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden>🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search machines, brand or muscle…"
          className="min-h-[44px] w-full rounded-xl border border-line bg-surface2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {q ? (
          <button aria-label="clear search" onClick={() => setQ("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-faint active:bg-surface3">
            ✕
          </button>
        ) : null}
      </div>

      {/* View pills */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {VIEWS.map((v) => {
          const c = counts[v.id];
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold ${view === v.id ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface2 text-muted"}`}
            >
              {v.label}
              {c ? <span className="ml-1.5 rounded-full bg-warn/20 px-1.5 text-xs text-warn">{c}</span> : null}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center text-sm text-faint">
          <span>{ql ? `No machines match “${q.trim()}”.` : view === "needs-naming" ? "Nothing needs naming. 🎉" : view === "needs-photo" ? "Every machine has a gym photo. 📸" : "No machines here yet."}</span>
          {ql ? (
            <button onClick={() => setQ("")} className="min-h-[44px] rounded-xl border border-line px-5 text-sm font-semibold active:bg-surface2">
              Clear search
            </button>
          ) : view !== "needs-naming" && view !== "needs-photo" ? (
            <button onClick={restore} className="min-h-[44px] rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink active:scale-95">
              Restore default machines
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((m) => {
            const last = lastLogFor(data.logs, m.id);
            return (
              <div key={m.id} className={`card overflow-hidden ${m.rating === "avoid" ? "opacity-60" : ""}`}>
                <button onClick={() => setSelectedId(m.id)} className="block w-full text-left active:opacity-90">
                  <div className="relative aspect-[4/3] w-full">
                    <PhotoTile machine={m} />
                    {m.needsNaming ? <span className="chip absolute left-2 top-2 bg-warn/90 text-[#1a1303]">name?</span> : null}
                    {usedToday.has(m.id) ? <span className="chip absolute bottom-2 left-2 bg-good/90 text-[#04210f]">✓ today</span> : null}
                    <div className="absolute right-2 top-2 flex gap-1">
                      {m.confidence === "likely" ? <span className="chip bg-black/50 text-accent">AI</span> : m.confidence === "unknown" ? <span className="chip bg-warn/90 text-[#1a1303]">AI?</span> : null}
                      {m.rating === "favorite" ? <span className="chip bg-black/50 text-warn">★</span> : null}
                      {m.trainer ? <span className="chip bg-black/50 text-accent">T</span> : null}
                      {data.flagged.includes(m.id) ? <span className="chip bg-bad/90 text-white">⚑</span> : null}
                    </div>
                  </div>
                </button>
                <div className="flex items-end justify-between gap-1 p-2.5">
                  <button onClick={() => setSelectedId(m.id)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-bold">{m.name}</div>
                    <div className="truncate text-[11px] text-muted">
                      {[m.brand, m.model].filter(Boolean).join(" ")}
                      {m.brand || m.model ? " · " : ""}
                      {CATEGORY_LABEL[m.category]}
                    </div>
                    {last ? <div className="text-[11px] tabular-nums text-faint">last {last.weight} lb</div> : null}
                  </button>
                  <button
                    className="tap flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-line px-2 text-sm active:bg-surface2"
                    aria-label={`${m.gymPhotoId ? "replace photo" : "add photo"} for ${m.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPhoto(m.id);
                    }}
                  >
                    📷{!m.gymPhotoId ? <span className="text-[11px] font-semibold">Add</span> : null}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.machines.length > 0 ? (
        <button onClick={restore} className="mx-auto mt-1 text-xs font-semibold text-faint active:text-muted">
          ↺ Restore default machines
        </button>
      ) : null}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />

      {selected ? <MachineDetail machine={selected} onClose={() => setSelectedId(null)} showToast={showToast} /> : null}
      {scanOpen ? <GymScan onClose={() => setScanOpen(false)} showToast={showToast} /> : null}
    </div>
  );
}
