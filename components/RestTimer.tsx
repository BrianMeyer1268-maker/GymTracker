"use client";

import { useEffect, useRef, useState } from "react";

function beep() {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio not allowed */
  }
}
function vibrate() {
  try {
    navigator.vibrate?.([300, 120, 300]);
  } catch {
    /* not supported */
  }
}
function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Compact rest countdown docked at the bottom — you can keep reading/editing the
 * logger while it runs. Beeps + vibrates on completion. onClose reports seconds rested.
 */
export default function RestTimer({ seconds, onClose }: { seconds: number; onClose: (usedSec: number) => void }) {
  const [target, setTarget] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [done, setDone] = useState(false);
  const endRef = useRef(Date.now() + seconds * 1000);

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      const rem = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        setDone(true);
        beep();
        vibrate();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [done]);

  function addThirty() {
    setTarget((t) => t + 30);
    setRemaining((r) => r + 30);
    endRef.current = Date.now() + (remaining + 30) * 1000;
    setDone(false);
  }

  const used = done ? target : Math.max(0, target - remaining);
  const frac = target > 0 ? Math.min(1, Math.max(0, remaining / target)) : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-app px-3 pb-safe">
      <div className={`mb-1 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl ${done ? "border-good bg-good text-[#04210f]" : "border-line bg-surface3"}`}>
        <div className="w-[64px] shrink-0 text-3xl font-extrabold tabular-nums">{done ? "GO" : fmt(remaining)}</div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] font-bold uppercase tracking-widest ${done ? "text-[#04210f]/70" : "text-faint"}`}>{done ? "Rest done — next set" : "Resting"}</div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/25">
            <div className={`h-full rounded-full ${done ? "bg-[#04210f]" : "bg-accent"}`} style={{ width: `${frac * 100}%` }} />
          </div>
        </div>
        {!done ? (
          <button className="tap min-h-[44px] shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-ink active:bg-surface2" onClick={addThirty}>
            +30
          </button>
        ) : null}
        <button
          className={`tap min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-bold active:scale-95 ${done ? "bg-[#04210f] text-good" : "bg-accent text-accent-ink"}`}
          onClick={() => onClose(used)}
        >
          {done ? "Done" : "Skip"}
        </button>
      </div>
    </div>
  );
}
