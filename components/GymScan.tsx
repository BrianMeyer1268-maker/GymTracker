"use client";

import { useRef, useState } from "react";
import type { Machine, MachineConfidence, MovementCategory } from "@/lib/types";
import { useStore } from "@/lib/store";
import { CATEGORY_LABEL } from "@/lib/movement";
import { uid } from "@/lib/storage";
import { downscaleImage } from "@/lib/photos";
import { interpretGym, type DetectedMachine } from "@/lib/aiClient";
import Sheet from "./Sheet";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as MovementCategory[];
const inputCls = "min-h-[44px] w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

const CONF_CLS: Record<MachineConfidence, string> = {
  confirmed: "bg-good/15 text-good",
  likely: "bg-accent/15 text-accent",
  unknown: "bg-warn/15 text-warn",
  "needs-naming": "bg-warn/15 text-warn",
};

interface Row extends DetectedMachine {
  rid: string;
  category: MovementCategory;
  include: boolean;
}

function validCat(c: string): MovementCategory {
  return CATEGORIES.includes(c as MovementCategory) ? (c as MovementCategory) : "core";
}

export default function GymScan({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const { addMachine } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ gymName?: string | null; notes?: string | null } | null>(null);

  async function addPhotos(files: FileList) {
    const next: string[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      try {
        next.push(await downscaleImage(f, 900, 0.7));
      } catch {
        /* skip */
      }
    }
    setImages((prev) => [...prev, ...next].slice(0, 6));
  }

  async function run() {
    if (images.length === 0 && !text.trim()) {
      showToast("Add a photo or some text first");
      return;
    }
    setLoading(true);
    try {
      const res = await interpretGym({ images, text });
      setMeta({ gymName: res.gymName, notes: res.notes });
      setRows(
        (res.machines ?? []).map((m) => ({
          ...m,
          rid: uid(),
          category: validCat(String(m.category)),
          confidence: (m.confidence as MachineConfidence) ?? "likely",
          include: true,
        })),
      );
      if (!res.machines?.length) showToast("No machines detected — try a clearer photo");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Interpretation failed");
    } finally {
      setLoading(false);
    }
  }

  function toMachine(r: Row): Machine {
    const cardio = r.category === "conditioning" || r.category === "mobility";
    const name = r.name.trim();
    return {
      id: `ai-${uid()}`,
      name: name || "New machine",
      brand: r.brand || undefined,
      category: r.category,
      equipment: cardio ? "cardio" : "machine",
      progression: cardio ? "cardio" : "machine",
      repTarget: (cardio ? [0, 0] : [8, 12]) as [number, number],
      primaryMuscles: r.primaryMuscles ?? [],
      confidence: !name ? "needs-naming" : (r.confidence as MachineConfidence),
      needsNaming: !name || r.confidence === "unknown",
      custom: true,
    };
  }

  function addAll() {
    const include = (rows ?? []).filter((r) => r.include);
    include.forEach((r) => addMachine(toMachine(r)));
    showToast(`Added ${include.length} machine${include.length === 1 ? "" : "s"} ✓`);
    onClose();
  }

  const includeCount = (rows ?? []).filter((r) => r.include).length;

  return (
    <Sheet
      open
      onClose={onClose}
      title="✨ Scan gym with AI"
      footer={
        rows ? (
          <button className="tap min-h-[52px] w-full rounded-xl bg-accent font-bold text-accent-ink disabled:opacity-50" disabled={includeCount === 0} onClick={addAll}>
            Add {includeCount} machine{includeCount === 1 ? "" : "s"} to catalog
          </button>
        ) : (
          <button className="tap min-h-[52px] w-full rounded-xl bg-accent font-bold text-accent-ink disabled:opacity-50" disabled={loading} onClick={run}>
            {loading ? "Reading…" : "✨ Interpret with AI"}
          </button>
        )
      }
    >
      {!rows ? (
        <>
          <p className="text-sm text-muted">Upload photos of the equipment, a gym flyer, or the floor — and/or paste the gym&apos;s website or a description. AI will list the machines for you to review.</p>
          <p className="mt-1 text-[11px] text-faint">Photos are sent to OpenAI for reading. Nothing else leaves your device.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
            {images.length < 6 ? (
              <button className="h-16 w-16 rounded-lg border border-dashed border-line text-2xl text-faint active:bg-surface2" onClick={() => fileRef.current?.click()}>
                +
              </button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { if (e.target.files) addPhotos(e.target.files); e.target.value = ""; }} />

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Website link or description (optional)</span>
            <textarea className={`${inputCls} min-h-[80px] py-2`} value={text} placeholder="e.g. johnsonfitness.com Matrix line, or 'rack of dumbbells, 2 squat racks, leg press, lat pulldown…'" onChange={(e) => setText(e.target.value)} />
          </label>
        </>
      ) : (
        <>
          <div className="mb-2 text-sm">
            <span className="font-bold">{rows.length} detected{meta?.gymName ? ` · ${meta.gymName}` : ""}.</span> <span className="text-muted">Review, fix categories, untick anything wrong.</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.rid} className={`mb-2 rounded-xl border border-line p-2.5 ${r.include ? "" : "opacity-45"}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={r.include} onChange={(e) => setRows((rs) => rs!.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))} className="h-5 w-5 accent-accent" />
                <input className={`${inputCls} flex-1`} value={r.name} onChange={(e) => setRows((rs) => rs!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                {r.confidence ? <span className={`chip ${CONF_CLS[r.confidence]}`}>{r.confidence}</span> : null}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <select className={inputCls} value={r.category} onChange={(e) => setRows((rs) => rs!.map((x, j) => (j === i ? { ...x, category: e.target.value as MovementCategory } : x)))}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
                {r.beginnerLabel ? <span className="shrink-0 text-[11px] text-faint">“{r.beginnerLabel}”</span> : null}
              </div>
            </div>
          ))}
          <button className="mt-1 text-xs font-semibold text-muted active:text-ink" onClick={() => setRows(null)}>
            ← Start over
          </button>
        </>
      )}
    </Sheet>
  );
}
