"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function ProfilePicker({ onDone }: { onDone: () => void }) {
  const { profiles, activeId, switchProfile, addProfile, renameProfile, deleteProfile, shareCatalog, setShareCatalog } = useStore();
  const [edit, setEdit] = useState(false);

  function pick(id: string) {
    if (id !== activeId) switchProfile(id);
    onDone();
  }
  function add() {
    const name = typeof window !== "undefined" ? window.prompt("New profile name") : null;
    if (name && name.trim()) {
      addProfile(name.trim());
      onDone();
    }
  }
  function rename(id: string, current: string) {
    const name = typeof window !== "undefined" ? window.prompt("Rename profile", current) : null;
    if (name && name.trim()) renameProfile(id, name.trim());
  }
  function del(id: string, name: string) {
    if (typeof window !== "undefined" && window.confirm(`Delete "${name}" and all its data? This can't be undone.`)) deleteProfile(id);
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-faint">Iron Compass</div>
        <h1 className="mt-1 text-2xl font-extrabold">Who&apos;s training?</h1>
      </div>

      <div className="grid w-full grid-cols-2 gap-4">
        {profiles.map((p) => (
          <div key={p.id} className="relative">
            <button
              onClick={() => (edit ? rename(p.id, p.name) : pick(p.id))}
              className={`tap flex min-h-[124px] w-full flex-col items-center justify-center gap-2 rounded-2xl border p-4 active:scale-[0.98] ${p.id === activeId ? "border-accent bg-accent/10" : "border-line bg-surface"}`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold text-[#04181f]" style={{ backgroundColor: p.color }}>
                {initial(p.name)}
              </span>
              <span className="text-base font-bold">{p.name}</span>
              {edit ? <span className="text-[10px] text-faint">tap to rename</span> : p.id === activeId ? <span className="text-[10px] font-bold uppercase tracking-wide text-accent">active</span> : null}
            </button>
            {edit && profiles.length > 1 ? (
              <button className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-bad text-sm font-bold text-white" aria-label={`delete ${p.name}`} onClick={() => del(p.id, p.name)}>
                ✕
              </button>
            ) : null}
          </div>
        ))}
        <button onClick={add} className="tap flex min-h-[124px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-faint active:bg-surface2">
          <span className="text-3xl">＋</span>
          <span className="text-sm font-semibold">Add profile</span>
        </button>
      </div>

      <div className="flex w-full items-center justify-between rounded-xl border border-line bg-surface2 p-3">
        <div>
          <div className="text-sm font-semibold">Share machine catalog</div>
          <div className="text-[11px] text-faint">{shareCatalog ? "Same gym → same machines for everyone" : "Each profile has its own machines"}</div>
        </div>
        <button onClick={() => setShareCatalog(!shareCatalog)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${shareCatalog ? "bg-accent" : "bg-surface3"}`} aria-pressed={shareCatalog} aria-label="share catalog">
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${shareCatalog ? "left-6" : "left-1"}`} />
        </button>
      </div>

      <button className="text-sm font-semibold text-muted active:text-ink" onClick={() => setEdit((v) => !v)}>
        {edit ? "Done editing" : "Edit profiles"}
      </button>
    </div>
  );
}
