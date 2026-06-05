"use client";

import { useState } from "react";
import { unlock } from "@/lib/access";

export default function Login({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      const ok = await unlock(code.trim());
      if (ok) onUnlock();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col items-center justify-center gap-6 px-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="h-20 w-20 rounded-2xl" />
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-faint">Iron Compass</div>
        <h1 className="mt-1 text-2xl font-extrabold">Private access</h1>
        <p className="mt-1 text-sm text-muted">Enter your access code to continue.</p>
      </div>
      <div className="w-full">
        <input
          type="password"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Access code"
          className={`min-h-[54px] w-full rounded-xl border bg-surface2 px-4 text-center text-lg font-semibold text-ink focus:outline-none focus:ring-2 ${error ? "border-bad ring-bad" : "border-line focus:ring-accent"}`}
        />
        {error ? <div className="mt-2 text-sm font-semibold text-bad">Wrong code — try again.</div> : null}
      </div>
      <button className="tap min-h-[54px] w-full rounded-xl bg-accent text-base font-bold text-accent-ink disabled:opacity-50" disabled={busy} onClick={submit}>
        {busy ? "Checking…" : "Unlock"}
      </button>
    </div>
  );
}
