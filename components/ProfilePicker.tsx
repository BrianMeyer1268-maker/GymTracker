"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/profiles";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function ProfilePicker({ onDone }: { onDone: () => void }) {
  const { profiles, activeId, switchProfile, addProfile, renameProfile, deleteProfile, shareCatalog, setShareCatalog, setProfilePin, verifyPin } = useStore();
  const [edit, setEdit] = useState(false);
  const [pinFor, setPinFor] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinErr, setPinErr] = useState(false);

  function enter(id: string) {
    if (id !== activeId) switchProfile(id);
    onDone();
  }
  function pick(id: string) {
    const p = profiles.find((x) => x.id === id);
    if (p?.pinHash) {
      setPinFor(p);
      setPinInput("");
      setPinErr(false);
    } else {
      enter(id);
    }
  }
  function submitPin(val: string) {
    if (!pinFor) return;
    if (verifyPin(pinFor.id, val)) {
      const id = pinFor.id;
      setPinFor(null);
      setPinInput("");
      enter(id);
    } else {
      setPinErr(true);
      setPinInput("");
    }
  }
  function onPinChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    setPinErr(false);
    setPinInput(digits);
    if (digits.length === 4) submitPin(digits);
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
  function managePin(p: Profile) {
    if (typeof window === "undefined") return;
    const has = !!p.pinHash;
    const v = window.prompt(has ? `Change ${p.name}'s PIN — enter a new 4-digit PIN, or leave blank to remove the lock` : `Set a 4-digit PIN to lock ${p.name}`, "");
    if (v === null) return; // cancelled
    const t = v.trim();
    if (!t) {
      if (has) setProfilePin(p.id, null);
      return;
    }
    if (!/^\d{4}$/.test(t)) {
      window.alert("PIN must be exactly 4 digits.");
      return;
    }
    setProfilePin(p.id, t);
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
              <span className="flex items-center gap-1 text-base font-bold">
                {p.name}
                {p.pinHash ? <span className="text-xs text-faint" aria-label="locked">🔒</span> : null}
              </span>
              {edit ? <span className="text-[10px] text-faint">tap to rename</span> : p.id === activeId ? <span className="text-[10px] font-bold uppercase tracking-wide text-accent">active</span> : null}
            </button>
            {edit ? (
              <>
                <button
                  className="absolute -left-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface2 text-xs active:bg-surface3"
                  aria-label={`${p.pinHash ? "change" : "set"} PIN for ${p.name}`}
                  onClick={() => managePin(p)}
                >
                  {p.pinHash ? "🔒" : "🔓"}
                </button>
                {profiles.length > 1 ? (
                  <button className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-bad text-sm font-bold text-white" aria-label={`delete ${p.name}`} onClick={() => del(p.id, p.name)}>
                    ✕
                  </button>
                ) : null}
              </>
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
      {edit ? <p className="-mt-3 text-center text-[11px] text-faint">Tap 🔓/🔒 to set a private PIN · tap a tile to rename</p> : null}

      {pinFor ? (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-black/80 px-8 backdrop-blur-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold text-[#04181f]" style={{ backgroundColor: pinFor.color }}>
            {initial(pinFor.name)}
          </span>
          <div className="text-lg font-bold">Enter {pinFor.name}&apos;s PIN</div>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pinInput}
            onChange={(e) => onPinChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitPin(pinInput); }}
            className={`w-44 rounded-xl border bg-surface2 px-4 py-3 text-center text-3xl tracking-[0.4em] outline-none ${pinErr ? "border-bad" : "border-line"}`}
          />
          {pinErr ? <div className="text-sm font-semibold text-bad">Wrong PIN — try again</div> : <div className="text-xs text-faint">4-digit PIN</div>}
          <div className="flex gap-3">
            <button onClick={() => { setPinFor(null); setPinInput(""); setPinErr(false); }} className="rounded-xl border border-line px-5 py-3 font-semibold active:bg-surface2">
              Cancel
            </button>
            <button onClick={() => submitPin(pinInput)} className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-ink active:scale-95">
              Unlock
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
