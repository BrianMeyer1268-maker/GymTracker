"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { GYM_TYPE_ICON, GYM_TYPE_LABEL } from "@/lib/gyms";
import Sheet from "./Sheet";
import GymImport from "./GymImport";

export default function LocationPicker({ onClose }: { onClose: () => void }) {
  const { data, activeLocation, locations, setActiveLocation, setDefaultLocation, toggleFavoriteLocation, deleteLocation } = useStore();
  const [importOpen, setImportOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const defaultId = data.defaultLocationId;
  const favs = data.favoriteLocationIds ?? [];

  function pick(id: string) {
    setActiveLocation(id);
    onClose();
  }
  function del(id: string, name: string) {
    if (typeof window !== "undefined" && window.confirm(`Remove "${name}" from your locations?`)) deleteLocation(id);
  }

  // Favorites float to the top.
  const sorted = [...locations].sort((a, b) => (favs.includes(b.id) ? 1 : 0) - (favs.includes(a.id) ? 1 : 0));

  return (
    <Sheet open onClose={onClose} title="Choose location">
      <div className="flex flex-col gap-2">
        {sorted.map((l) => {
          const active = l.id === activeLocation?.id;
          const fav = favs.includes(l.id);
          return (
            <div key={l.id} className={`flex items-center gap-2 rounded-xl border p-3 ${active ? "border-accent bg-accent/10" : "border-line bg-surface"}`}>
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => pick(l.id)}>
                <span className="text-2xl" aria-hidden>{GYM_TYPE_ICON[l.type]}</span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{l.nickname || l.name}</span>
                  <span className="block truncate text-[11px] text-faint">
                    {GYM_TYPE_LABEL[l.type]}
                    {l.id === defaultId ? " · default" : ""}
                    {l.needsReview ? " · needs review" : ""}
                  </span>
                </span>
              </button>
              <button aria-label={`favorite ${l.name}`} className={`px-1 text-lg ${fav ? "text-pink-400" : "text-faint"}`} onClick={() => toggleFavoriteLocation(l.id)}>
                {fav ? "♥" : "♡"}
              </button>
              <button aria-label={`make ${l.name} default`} className={`px-1 text-lg ${l.id === defaultId ? "text-warn" : "text-faint"}`} onClick={() => setDefaultLocation(l.id)}>
                {l.id === defaultId ? "★" : "☆"}
              </button>
              {edit && locations.length > 1 ? (
                <button aria-label={`delete ${l.name}`} className="px-1 text-bad" onClick={() => del(l.id, l.name)}>✕</button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => setImportOpen(true)} className="min-h-[48px] rounded-xl bg-accent font-bold text-accent-ink active:scale-95">+ Add gym</button>
        <button onClick={() => setEdit((v) => !v)} className="min-h-[48px] rounded-xl border border-line font-semibold text-muted active:bg-surface2">{edit ? "Done editing" : "Edit"}</button>
      </div>
      <p className="mt-3 text-[11px] text-faint">★ default · ♥ favorite. Add a gym manually, by website, or with “Find My Gym” + AI import.</p>

      {importOpen ? <GymImport onClose={() => setImportOpen(false)} onSaved={() => { setImportOpen(false); onClose(); }} /> : null}
    </Sheet>
  );
}
