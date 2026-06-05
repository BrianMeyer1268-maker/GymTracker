"use client";

import { useState } from "react";
import type { BodyCompEntry } from "@/lib/types";
import { useStore } from "@/lib/store";
import { metricTrend, sortedBodyComp, recompAnalyzer, type BodyMetric } from "@/lib/bodyComp";
import { overallStrength } from "@/lib/analytics";
import { todayISO, fmtShort } from "@/lib/date";
import Sparkline from "./Sparkline";
import BodyScan from "./BodyScan";

interface Cfg {
  key: BodyMetric;
  label: string;
  unit: string;
  good: "up" | "down";
}
const METRICS: Cfg[] = [
  { key: "weight", label: "Weight", unit: "lb", good: "down" },
  { key: "bodyFat", label: "Body Fat", unit: "%", good: "down" },
  { key: "skeletalMuscle", label: "Skeletal Muscle", unit: "lb", good: "up" },
  { key: "visceralFat", label: "Visceral Fat", unit: "", good: "down" },
];

function num(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  const v = parseFloat(t);
  return Number.isNaN(v) ? undefined : v;
}

function deltaTone(good: "up" | "down", d: number): string {
  if (d === 0) return "text-faint";
  const improving = good === "down" ? d < 0 : d > 0;
  return improving ? "text-good" : "text-warn";
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] w-full rounded-xl border border-line bg-surface2 px-3 text-lg font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  );
}

export default function BodyComp({ showToast }: { showToast: (m: string) => void }) {
  const { data, upsertBodyComp, deleteBodyComp } = useStore();
  const entries = data.bodyComp;
  const latest = sortedBodyComp(entries).slice(-1)[0];
  const recomp = recompAnalyzer(entries, overallStrength(data.logs, data.machines));

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [visceral, setVisceral] = useState("");
  const [waist, setWaist] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  function save() {
    const w = num(weight);
    if (w === undefined) {
      showToast("Enter a body weight");
      return;
    }
    const entry: BodyCompEntry = {
      id: `bc-${date}`,
      date,
      weight: w,
      bodyFat: num(bodyFat),
      skeletalMuscle: num(muscle),
      visceralFat: num(visceral),
      waist: num(waist),
    };
    upsertBodyComp(entry);
    showToast("Body comp saved ✓");
    setWeight("");
    setBodyFat("");
    setMuscle("");
    setVisceral("");
    setWaist("");
    setDate(todayISO());
  }

  const toneBorder =
    recomp.tone === "up" ? "border-good/40 bg-good/10" : recomp.tone === "down" ? "border-bad/40 bg-bad/10" : recomp.tone === "hold" ? "border-accent/30 bg-accent/10" : "border-line bg-surface";
  const toneText = recomp.tone === "up" ? "text-good" : recomp.tone === "down" ? "text-bad" : recomp.tone === "hold" ? "text-accent" : "text-muted";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint">Body</div>
          <h1 className="text-2xl font-extrabold leading-tight">Composition</h1>
        </div>
        <button className="min-h-[44px] rounded-xl border border-accent/50 bg-accent/10 px-3 text-sm font-bold text-accent active:scale-95" onClick={() => setScanOpen(true)}>
          ✨ Import scan
        </button>
      </header>

      {scanOpen ? <BodyScan onClose={() => setScanOpen(false)} showToast={showToast} /> : null}

      {/* Recomp analyzer */}
      <div className={`rounded-2xl border p-4 ${toneBorder}`}>
        <div className={`text-[11px] font-bold uppercase tracking-wide ${toneText}`}>Recomposition</div>
        <div className="mt-0.5 text-lg font-extrabold">{recomp.title}</div>
        <p className="mt-1 text-sm leading-snug text-muted">{recomp.text}</p>
      </div>

      {/* Trend cards */}
      <div className="grid grid-cols-2 gap-3">
        {METRICS.map((m) => {
          const t = metricTrend(entries, m.key);
          const has = t.latest !== undefined;
          return (
            <div key={m.key} className="card p-3.5">
              <div className="text-xs font-semibold text-muted">{m.label}</div>
              <div className="mt-0.5 text-2xl font-extrabold tabular-nums leading-none">
                {has ? t.latest : "—"}
                {has && m.unit ? <span className="text-xs font-semibold text-faint"> {m.unit}</span> : null}
              </div>
              <div className="mt-1 h-10">
                <Sparkline values={t.series.map((p) => p.value)} className={m.good === "up" ? "text-good" : "text-accent"} />
              </div>
              <div className="mt-1 text-[11px] font-bold tabular-nums">
                {t.deltaPrev === undefined ? (
                  <span className="text-faint">first entry</span>
                ) : (
                  <span className={deltaTone(m.good, t.deltaPrev)}>
                    {t.deltaPrev > 0 ? "▲" : t.deltaPrev < 0 ? "▼" : "■"} {Math.abs(t.deltaPrev)} {m.unit} vs last
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add entry */}
      <div className="card p-4">
        <div className="mb-3 text-sm font-bold">Log a measurement</div>
        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs font-bold text-muted">Date</span>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="min-h-[48px] w-full rounded-xl border border-line bg-surface2 px-3 text-base font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (lb)" value={weight} onChange={setWeight} placeholder={latest ? String(latest.weight) : "230"} />
          <Field label="Body Fat (%)" value={bodyFat} onChange={setBodyFat} placeholder={latest?.bodyFat != null ? String(latest.bodyFat) : "27"} />
          <Field label="Skeletal Muscle" value={muscle} onChange={setMuscle} placeholder={latest?.skeletalMuscle != null ? String(latest.skeletalMuscle) : "97"} />
          <Field label="Visceral Fat" value={visceral} onChange={setVisceral} placeholder={latest?.visceralFat != null ? String(latest.visceralFat) : "11"} />
        </div>
        <div className="mt-3">
          <Field label="Waist (in) — optional" value={waist} onChange={setWaist} placeholder={latest?.waist != null ? String(latest.waist) : "—"} />
        </div>
        <button className="mt-4 min-h-[50px] w-full rounded-xl bg-accent font-bold text-accent-ink active:scale-[0.99]" onClick={save}>
          Save entry
        </button>
      </div>

      {/* History */}
      <div className="card p-4">
        <div className="mb-1 text-sm font-bold">History</div>
        {entries.length === 0 ? (
          <div className="py-4 text-center text-sm text-faint">No entries yet.</div>
        ) : (
          sortedBodyComp(entries)
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.id} className="flex items-center gap-2 border-b border-line/60 py-2.5 last:border-0">
                <span className="w-14 text-sm font-bold">{fmtShort(e.date)}</span>
                <span className="flex-1 text-xs tabular-nums text-muted">
                  <b className="text-ink">{e.weight}</b> lb
                  {e.bodyFat != null ? <> · <b className="text-ink">{e.bodyFat}</b>% bf</> : null}
                  {e.skeletalMuscle != null ? <> · <b className="text-ink">{e.skeletalMuscle}</b> sm</> : null}
                  {e.visceralFat != null ? <> · vf {e.visceralFat}</> : null}
                  {e.waist != null ? <> · {e.waist}&quot;</> : null}
                </span>
                <button
                  className="px-2 text-faint active:text-bad"
                  aria-label="delete"
                  onClick={() => {
                    if (typeof window !== "undefined" && window.confirm(`Delete ${fmtShort(e.date)} entry?`)) deleteBodyComp(e.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
