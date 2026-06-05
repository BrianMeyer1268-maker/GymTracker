"use client";

import { useRef, useState } from "react";
import type { EquipmentType, Machine, MachineRating, MovementCategory, ProgressionRule } from "@/lib/types";
import { useStore } from "@/lib/store";
import { CATEGORY_LABEL, EQUIPMENT_LABEL } from "@/lib/movement";
import { lastLogFor, bestWeightFor } from "@/lib/analytics";
import { downscaleImage } from "@/lib/photos";
import Sheet from "./Sheet";
import Segmented from "./Segmented";
import PhotoTile from "./PhotoTile";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as MovementCategory[];
const EQUIPMENT = Object.keys(EQUIPMENT_LABEL) as EquipmentType[];
const PROGRESSIONS: ProgressionRule[] = ["machine", "cable", "dumbbell", "barbell", "smith", "bodyweight", "cardio"];
const RATINGS: { value: MachineRating; label: string; selectedClass: string }[] = [
  { value: "favorite", label: "★ Favorite", selectedClass: "bg-warn/20 border-warn text-warn" },
  { value: "normal", label: "Normal", selectedClass: "bg-accent/20 border-accent text-accent" },
  { value: "avoid", label: "Avoid", selectedClass: "bg-bad/20 border-bad text-bad" },
];

const inputCls = "min-h-[48px] w-full rounded-xl border border-line bg-surface2 px-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent";
const lbl = "mb-1.5 block text-xs font-bold text-muted";

export default function MachineDetail({ machine, onClose, showToast }: { machine: Machine; onClose: () => void; showToast: (m: string) => void }) {
  const { data, updateMachine, setGymPhoto, removeGymPhoto, setFlag, archiveMachine } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const flagged = data.flagged.includes(machine.id);
  const lastUsed = lastLogFor(data.logs, machine.id)?.weight;
  const best = bestWeightFor(data.logs, machine.id);
  const hasGym = !!machine.gymPhotoId;
  const hasMfr = !!machine.manufacturerPhoto;

  const [name, setName] = useState(machine.needsNaming ? "" : machine.name);
  const [brand, setBrand] = useState(machine.brand ?? "");
  const [model, setModel] = useState(machine.model ?? "");
  const [category, setCategory] = useState<MovementCategory>(machine.category);
  const [equipment, setEquipment] = useState<EquipmentType>(machine.equipment);
  const [progression, setProgression] = useState<ProgressionRule>(machine.progression);
  const [repLo, setRepLo] = useState(String(machine.repTarget[0]));
  const [repHi, setRepHi] = useState(String(machine.repTarget[1]));
  const [usual, setUsual] = useState(machine.usualWeight != null ? String(machine.usualWeight) : "");
  const [startW, setStartW] = useState(machine.startingWeight != null ? String(machine.startingWeight) : "");
  const [jump, setJump] = useState(machine.smallestJump != null ? String(machine.smallestJump) : "");
  const [primary, setPrimary] = useState((machine.primaryMuscles ?? []).join(", "));
  const [secondary, setSecondary] = useState((machine.secondaryMuscles ?? []).join(", "));
  const [rating, setRating] = useState<MachineRating>(machine.rating ?? "normal");
  const [trainer, setTrainer] = useState(!!machine.trainer);
  const [notes, setNotes] = useState(machine.notes ?? "");
  const [seat, setSeat] = useState(machine.setup?.seat ?? "");
  const [handle, setHandle] = useState(machine.setup?.handle ?? "");
  const [pad, setPad] = useState(machine.setup?.pad ?? "");
  const [start, setStart] = useState(machine.setup?.start ?? "");
  const [formCue, setFormCue] = useState(machine.setup?.formCue ?? "");

  async function onPhoto(file: File) {
    try {
      const dataUrl = await downscaleImage(file);
      setGymPhoto(machine.id, dataUrl);
      showToast("Gym photo saved ✓");
    } catch {
      showToast("Couldn't read that photo");
    }
  }

  function save() {
    const trimmed = name.trim();
    const u = (s: string) => (s.trim() === "" ? undefined : s.trim());
    const setup = { seat: u(seat), handle: u(handle), pad: u(pad), start: u(start), formCue: u(formCue) };
    const hasSetup = Object.values(setup).some(Boolean);
    updateMachine(machine.id, {
      name: trimmed || machine.name || "New machine",
      needsNaming: trimmed === "",
      brand: u(brand),
      model: u(model),
      category,
      equipment,
      progression,
      repTarget: [parseInt(repLo, 10) || 0, parseInt(repHi, 10) || 0] as [number, number],
      usualWeight: usual.trim() === "" ? undefined : parseFloat(usual),
      startingWeight: startW.trim() === "" ? undefined : parseFloat(startW),
      smallestJump: jump.trim() === "" ? undefined : parseFloat(jump),
      rating,
      trainer,
      setup: hasSetup ? setup : undefined,
      notes: u(notes),
      primaryMuscles: primary.split(",").map((s) => s.trim()).filter(Boolean),
      secondaryMuscles: secondary.split(",").map((s) => s.trim()).filter(Boolean),
    });
    showToast("Machine saved ✓");
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={machine.needsNaming ? "New / unknown machine" : machine.name}
      footer={
        <button className="tap min-h-[52px] w-full rounded-xl bg-accent font-bold text-accent-ink active:scale-[0.99]" onClick={save}>
          Save machine
        </button>
      }
    >
      {/* Photo */}
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line">
          <PhotoTile machine={machine} />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2">
          <button className="min-h-[44px] rounded-xl border border-line text-sm font-semibold active:bg-surface2" onClick={() => fileRef.current?.click()}>
            {hasGym ? "Replace gym photo" : "📷 Add gym photo"}
          </button>
          {hasGym ? (
            <button className="text-xs text-faint active:text-bad" onClick={() => removeGymPhoto(machine.id)}>
              {hasMfr ? "Reset to manufacturer photo" : "Remove gym photo"}
            </button>
          ) : (
            <span className="text-[11px] text-faint">{hasMfr ? `Showing ${machine.photoSource ?? "stock"} photo (placeholder). Snap your machine to replace it.` : "Snap the machine so you recognize it by picture."}</span>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* Rating + trainer */}
      <div className="mt-4">
        <span className={lbl}>Top machines</span>
        <Segmented options={RATINGS} value={rating} onChange={setRating} />
        <button
          className={`mt-2 flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold ${trainer ? "border-accent bg-accent/15 text-accent" : "border-line text-muted"}`}
          onClick={() => setTrainer((v) => !v)}
        >
          <span>Trainer uses this machine</span>
          <span>{trainer ? "✓ on" : "off"}</span>
        </button>
      </div>

      {/* Core fields */}
      <div className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className={lbl}>Friendly name</span>
          <input className={inputCls} value={name} placeholder="e.g. Green Chest Press 1" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={lbl}>Brand</span>
            <input className={inputCls} value={brand} placeholder="Matrix" onChange={(e) => setBrand(e.target.value)} />
          </label>
          <label className="block">
            <span className={lbl}>Model</span>
            <input className={inputCls} value={model} placeholder="Versa, Magnum…" onChange={(e) => setModel(e.target.value)} />
          </label>
          <label className="block">
            <span className={lbl}>Movement</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as MovementCategory)}>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_LABEL[c]}</option>))}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Equipment</span>
            <select className={inputCls} value={equipment} onChange={(e) => setEquipment(e.target.value as EquipmentType)}>
              {EQUIPMENT.map((c) => (<option key={c} value={c}>{EQUIPMENT_LABEL[c]}</option>))}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Progression</span>
            <select className={inputCls} value={progression} onChange={(e) => setProgression(e.target.value as ProgressionRule)}>
              {PROGRESSIONS.map((c) => (
                <option key={c} value={c}>
                  {c === "machine" ? "Machine +10" : c === "cable" ? "Cable +5" : c === "dumbbell" ? "Dumbbell next pair" : c === "barbell" ? "Barbell +10" : c === "smith" ? "Smith +10" : c === "bodyweight" ? "Bodyweight (reps)" : "Cardio"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Rep low</span>
            <input className={inputCls} type="number" inputMode="numeric" value={repLo} onChange={(e) => setRepLo(e.target.value)} />
          </label>
          <label className="block">
            <span className={lbl}>Rep high</span>
            <input className={inputCls} type="number" inputMode="numeric" value={repHi} onChange={(e) => setRepHi(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className={lbl}>Primary muscles</span>
          <input className={inputCls} value={primary} placeholder="Chest, Triceps" onChange={(e) => setPrimary(e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>Secondary muscles</span>
          <input className={inputCls} value={secondary} placeholder="Front delts" onChange={(e) => setSecondary(e.target.value)} />
        </label>
      </div>

      {/* Working weights */}
      <div className="mt-4">
        <span className={lbl}>Working weights</span>
        <div className="mb-2 flex gap-2 text-xs text-muted">
          <span className="rounded-lg bg-surface2 px-2 py-1">Last used: <b className="text-ink">{lastUsed ?? "—"}</b></span>
          <span className="rounded-lg bg-surface2 px-2 py-1">Best: <b className="text-ink">{best ?? "—"}</b></span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className={lbl}>Usual</span>
            <input className={inputCls} type="number" inputMode="decimal" value={usual} onChange={(e) => setUsual(e.target.value)} />
          </label>
          <label className="block">
            <span className={lbl}>Starting</span>
            <input className={inputCls} type="number" inputMode="decimal" value={startW} onChange={(e) => setStartW(e.target.value)} />
          </label>
          <label className="block">
            <span className={lbl}>Min jump</span>
            <input className={inputCls} type="number" inputMode="decimal" value={jump} placeholder="5" onChange={(e) => setJump(e.target.value)} />
          </label>
        </div>
      </div>

      {/* Setup notes */}
      <div className="mt-4">
        <span className={lbl}>Setup notes (shown on logger)</span>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} value={seat} placeholder="Seat" onChange={(e) => setSeat(e.target.value)} />
          <input className={inputCls} value={handle} placeholder="Handle" onChange={(e) => setHandle(e.target.value)} />
          <input className={inputCls} value={pad} placeholder="Pad" onChange={(e) => setPad(e.target.value)} />
          <input className={inputCls} value={start} placeholder="Start position" onChange={(e) => setStart(e.target.value)} />
        </div>
        <input className={`${inputCls} mt-3`} value={formCue} placeholder="Form cue 💡" onChange={(e) => setFormCue(e.target.value)} />
        <input className={`${inputCls} mt-3`} value={notes} placeholder="Other notes" onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* Flag + archive */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-line p-3">
        <div>
          <div className="text-sm font-semibold">Pain flag</div>
          <div className="text-[11px] text-faint">Recommends backing off this movement.</div>
        </div>
        <button
          className={`min-h-[40px] rounded-lg px-4 text-sm font-bold ${flagged ? "bg-bad/20 text-bad" : "border border-line text-muted"}`}
          onClick={() => setFlag(machine.id, !flagged)}
        >
          {flagged ? "Flagged ⚑" : "Flag"}
        </button>
      </div>
      <button
        className="mt-3 w-full py-2 text-sm text-faint active:text-bad"
        onClick={() => {
          if (typeof window !== "undefined" && window.confirm(`Archive ${machine.name}? It won't appear in workouts.`)) {
            archiveMachine(machine.id);
            onClose();
          }
        }}
      >
        Archive machine
      </button>
    </Sheet>
  );
}
