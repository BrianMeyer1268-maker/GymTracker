"use client";

import { useRef, useState } from "react";
import type { BodyCompEntry } from "@/lib/types";
import { useStore } from "@/lib/store";
import { downscaleImage } from "@/lib/photos";
import { parseFitdays } from "@/lib/aiClient";
import { todayISO } from "@/lib/date";
import Sheet from "./Sheet";

const inputCls = "min-h-[48px] w-full rounded-xl border border-line bg-surface2 px-3 text-base font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent";

function numStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}
function num(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  const v = parseFloat(t);
  return Number.isNaN(v) ? undefined : v;
}

export default function BodyScan({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const { upsertBodyComp } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [review, setReview] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [visceral, setVisceral] = useState("");
  const [water, setWater] = useState("");
  const [bmr, setBmr] = useState("");

  async function addPhoto(file: File) {
    try {
      const url = await downscaleImage(file, 1100, 0.75);
      setImages((p) => [...p, url].slice(0, 2));
    } catch {
      showToast("Couldn't read that image");
    }
  }

  async function run() {
    if (images.length === 0 && !text.trim()) {
      showToast("Add a screenshot or some text first");
      return;
    }
    setLoading(true);
    try {
      const r = await parseFitdays({ images, text });
      if (r.date) setDate(r.date);
      setWeight(numStr(r.weight));
      setBodyFat(numStr(r.bodyFatPercent));
      setMuscle(numStr(r.skeletalMuscle));
      setVisceral(numStr(r.visceralFat));
      setWater(numStr(r.bodyWater));
      setBmr(numStr(r.bmr));
      setReview(!!r.needsReview);
      setExtracted(true);
      showToast(r.weight != null ? "Read it ✓ — confirm the numbers" : "Couldn't find numbers — enter manually");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Interpretation failed");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    const w = num(weight);
    if (w === undefined) {
      showToast("Enter a body weight to save");
      return;
    }
    const entry: BodyCompEntry = {
      id: `bc-${date}`,
      date,
      weight: w,
      bodyFat: num(bodyFat),
      skeletalMuscle: num(muscle),
      visceralFat: num(visceral),
      bodyWater: num(water),
      bmr: num(bmr),
    };
    upsertBodyComp(entry);
    showToast("Body comp saved ✓");
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="✨ Import body scan"
      footer={
        extracted ? (
          <button className="tap min-h-[52px] w-full rounded-xl bg-accent font-bold text-accent-ink" onClick={save}>
            Confirm &amp; save
          </button>
        ) : (
          <button className="tap min-h-[52px] w-full rounded-xl bg-accent font-bold text-accent-ink disabled:opacity-50" disabled={loading} onClick={run}>
            {loading ? "Reading…" : "✨ Read with AI"}
          </button>
        )
      }
    >
      <p className="text-sm text-muted">Upload a screenshot of your scale/app result (Fitdays, InBody…) or paste the numbers. AI fills the fields for you to confirm.</p>
      <p className="mt-1 text-[11px] text-faint">⚠ The image leaves your device and goes to OpenAI to be read. Nothing else does.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative h-20 w-16 overflow-hidden rounded-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        {images.length < 2 ? (
          <button className="h-20 w-16 rounded-lg border border-dashed border-line text-2xl text-faint active:bg-surface2" onClick={() => fileRef.current?.click()}>+</button>
        ) : null}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />

      <label className="mt-3 block">
        <span className="mb-1.5 block text-xs font-bold text-muted">Or paste the numbers (optional)</span>
        <textarea className={`${inputCls} min-h-[64px] py-2 text-sm font-normal`} value={text} placeholder="weight 230.6, body fat 26.9%, skeletal muscle 97.2, visceral fat 11, body water 55%, bmr 2050" onChange={(e) => setText(e.target.value)} />
      </label>

      {extracted ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            Confirm
            {review ? <span className="chip bg-warn/15 text-warn">needs review</span> : null}
          </div>
          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Date</span>
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} className={inputCls} style={{ colorScheme: "dark" }} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (lb)" value={weight} onChange={setWeight} />
            <Field label="Body Fat (%)" value={bodyFat} onChange={setBodyFat} />
            <Field label="Skeletal Muscle" value={muscle} onChange={setMuscle} />
            <Field label="Visceral Fat" value={visceral} onChange={setVisceral} />
            <Field label="Body Water (%)" value={water} onChange={setWater} />
            <Field label="BMR (cal)" value={bmr} onChange={setBmr} />
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-muted">{label}</span>
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}
