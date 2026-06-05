"use client";

import { useRef, useState } from "react";
import type { Machine, MachineConfidence, MovementCategory } from "@/lib/types";
import { useStore } from "@/lib/store";
import { CATEGORY_LABEL } from "@/lib/movement";
import { uid } from "@/lib/storage";
import { downscaleImage } from "@/lib/photos";
import { classifyMachine } from "@/lib/aiClient";
import Sheet from "./Sheet";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as MovementCategory[];
const inputCls = "min-h-[46px] w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

function validCat(c?: string): MovementCategory {
  return c && CATEGORIES.includes(c as MovementCategory) ? (c as MovementCategory) : "core";
}

export default function ClassifyMachine({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const { addMachine } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [conf, setConf] = useState<number | undefined>(undefined);
  const [review, setReview] = useState(false);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState<MovementCategory>("core");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [setupNotes, setSetupNotes] = useState("");

  async function addPhoto(file: File) {
    try {
      setImage(await downscaleImage(file, 1000, 0.72));
    } catch {
      showToast("Couldn't read that image");
    }
  }

  async function run() {
    if (!image && !note.trim()) {
      showToast("Take a photo of the machine first");
      return;
    }
    setLoading(true);
    try {
      const r = await classifyMachine({ images: image ? [image] : [], text: note });
      setName(r.friendlyName ?? "");
      setBrand(r.brand ?? "");
      setModel(r.model ?? "");
      setCategory(validCat(String(r.movementCategory)));
      setPrimary((r.primaryMuscles ?? []).join(", "));
      setSecondary((r.secondaryMuscles ?? []).join(", "));
      setSetupNotes(r.setupNotes ?? "");
      setConf(r.confidence);
      setReview(!!r.needsReview);
      setDone(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't identify it");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    const cardio = category === "conditioning" || category === "mobility";
    const trimmed = name.trim();
    const low = (conf ?? 0) < 0.5;
    const confidence: MachineConfidence = !trimmed ? "needs-naming" : low ? "unknown" : "likely";
    const machine: Machine = {
      id: `ai-${uid()}`,
      name: trimmed || "Unknown machine",
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      category,
      equipment: cardio ? "cardio" : "machine",
      progression: cardio ? "cardio" : "machine",
      repTarget: (cardio ? [0, 0] : [8, 12]) as [number, number],
      primaryMuscles: primary.split(",").map((s) => s.trim()).filter(Boolean),
      secondaryMuscles: secondary.split(",").map((s) => s.trim()).filter(Boolean),
      settingsNotes: setupNotes.trim() || undefined,
      confidence,
      needsNaming: !trimmed || low,
      custom: true,
    };
    addMachine(machine);
    showToast(`${machine.name} added · marked for review`);
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="✨ Identify a machine"
      footer={
        done ? (
          <div className="flex gap-2">
            <button className="tap min-h-[52px] flex-1 rounded-xl border border-line font-semibold text-faint active:bg-surface2" onClick={onClose}>
              Discard
            </button>
            <button className="tap min-h-[52px] flex-[1.6] rounded-xl bg-accent font-bold text-accent-ink" onClick={save}>
              Add to catalog
            </button>
          </div>
        ) : (
          <button className="tap min-h-[52px] w-full rounded-xl bg-accent font-bold text-accent-ink disabled:opacity-50" disabled={loading} onClick={run}>
            {loading ? "Identifying…" : "✨ Identify with AI"}
          </button>
        )
      }
    >
      <p className="text-sm text-muted">Standing at an unfamiliar machine? Snap a photo and AI will tell you what it is and how to start — then add it to your catalog.</p>
      <p className="mt-1 text-[11px] text-faint">⚠ The photo leaves your device and goes to OpenAI to be read.</p>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <button className="flex h-full w-full items-center justify-center text-2xl text-faint active:bg-surface2" onClick={() => fileRef.current?.click()}>📷</button>
          )}
        </div>
        <div className="flex-1">
          <button className="min-h-[44px] w-full rounded-xl border border-line text-sm font-semibold active:bg-surface2" onClick={() => fileRef.current?.click()}>
            {image ? "Retake photo" : "Take / choose photo"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
        </div>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-xs font-bold text-muted">Note (optional)</span>
        <input className={inputCls} value={note} placeholder="e.g. green machine near the mirrors" onChange={(e) => setNote(e.target.value)} />
      </label>

      {done ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            AI says
            {conf != null ? <span className={`chip ${conf >= 0.8 ? "bg-good/15 text-good" : conf >= 0.5 ? "bg-accent/15 text-accent" : "bg-warn/15 text-warn"}`}>{Math.round(conf * 100)}% sure</span> : null}
            {review ? <span className="chip bg-warn/15 text-warn">needs review</span> : null}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Name</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-muted">Brand</span>
              <input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-muted">Model</span>
              <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Movement</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as MovementCategory)}>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_LABEL[c]}</option>))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Primary muscles</span>
            <input className={inputCls} value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Secondary muscles</span>
            <input className={inputCls} value={secondary} onChange={(e) => setSecondary(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-muted">How to start / setup</span>
            <input className={inputCls} value={setupNotes} onChange={(e) => setSetupNotes(e.target.value)} />
          </label>
        </div>
      ) : null}
    </Sheet>
  );
}
