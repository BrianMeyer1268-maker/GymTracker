"use client";

import { useState } from "react";
import type { ActivityType, GymLocation, GymType, LocationSource } from "@/lib/types";
import { ACTIVITY_TYPES, GYM_TYPES } from "@/lib/types";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import { downscaleImage } from "@/lib/photos";
import { ACTIVITY_LABEL, GYM_TYPE_LABEL } from "@/lib/gyms";
import { importGym, type GymImportResult } from "@/lib/aiClient";
import { getCurrentLocation, placesProvider } from "@/lib/places";
import Sheet from "./Sheet";

const inputCls = "min-h-[44px] w-full rounded-xl border border-line bg-surface2 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";
const lbl = "mb-1 block text-xs font-bold text-muted";

function validType(s: unknown): GymType {
  return GYM_TYPES.includes(s as GymType) ? (s as GymType) : "mixed";
}

const DEFAULT_ACTIVITIES: Record<GymType, ActivityType[]> = {
  machine: ["machine-strength", "free-weights"],
  mixed: ["machine-strength", "free-weights", "run"],
  combat: ["kickboxing", "boxing", "bjj", "free-weights"],
  class: ["strength-conditioning", "recovery"],
  "free-weight": ["free-weights", "bodyweight"],
  cardio: ["run", "bike", "elliptical"],
  home: ["bodyweight", "free-weights", "recovery"],
  outdoor: ["run", "walk", "bike"],
};

/** Map the AI's free-text activities/classes to our activity types. */
function guessActivities(ai: GymImportResult, type: GymType): ActivityType[] {
  const text = [ai.activities, ai.classes, ai.equipment].flat().filter(Boolean).join(" ").toLowerCase();
  const picked = new Set<ActivityType>();
  if (/kick|muay/.test(text)) picked.add("kickboxing");
  if (/\bbox/.test(text)) picked.add("boxing");
  if (/bjj|jiu|grappl/.test(text)) picked.add("bjj");
  if (/free.?weight|dumbbell|barbell|squat rack/.test(text)) picked.add("free-weights");
  if (/machine|selectoriz|circuit|cable/.test(text)) picked.add("machine-strength");
  if (/treadmill|\brun\b/.test(text)) picked.add("run");
  if (/\bwalk/.test(text)) picked.add("walk");
  if (/bike|cycle|spin/.test(text)) picked.add("bike");
  if (/elliptical/.test(text)) picked.add("elliptical");
  if (/condition|hiit|bootcamp|\bs&c\b/.test(text)) picked.add("strength-conditioning");
  if (/yoga|mobility|stretch|recovery/.test(text)) picked.add("recovery");
  if (/bodyweight|calisthenic/.test(text)) picked.add("bodyweight");
  return picked.size ? [...picked] : DEFAULT_ACTIVITIES[type];
}

type Step = "input" | "review";

export default function GymImport({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { addLocation } = useStore();
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // input
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [source, setSource] = useState<LocationSource>("manual");

  // review
  const [rType, setRType] = useState<GymType>("mixed");
  const [rNickname, setRNickname] = useState("");
  const [rHours, setRHours] = useState("");
  const [rActs, setRActs] = useState<Set<ActivityType>>(new Set());
  const [rEquip, setREquip] = useState<string[]>([]);
  const [equipAdd, setEquipAdd] = useState("");
  const [ai, setAi] = useState<GymImportResult | null>(null);

  async function addImages(files: FileList) {
    const next: string[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      try {
        next.push(await downscaleImage(f, 900, 0.7));
      } catch {
        /* skip */
      }
    }
    setImages((p) => [...p, ...next].slice(0, 6));
    if (next.length) setSource("image");
  }

  async function findMyGym() {
    setGeoStatus("Getting your location…");
    setErr(null);
    try {
      const c = await getCurrentLocation();
      setCoords(c);
      setSource("location");
      const nearby = await placesProvider.searchNearbyGyms(c.lat, c.lng);
      if (nearby.length) {
        setGeoStatus(`Found ${nearby.length} nearby — pick one below.`);
      } else {
        setGeoStatus("Got your location. No nearby-gym lookup is connected yet — type the gym name or website below and import it.");
      }
    } catch (e) {
      setGeoStatus(null);
      setErr(e instanceof Error ? e.message : "Couldn't get your location.");
    }
  }

  function populateReview(res: GymImportResult | null, usedAI: boolean) {
    const type = validType(res?.type);
    setRType(type);
    setName((n) => res?.name || n || "");
    setAddress((a) => res?.address || a || "");
    setWebsite((w) => res?.website || w || "");
    setRHours(res?.hours || "");
    setRActs(new Set(usedAI && res ? guessActivities(res, type) : DEFAULT_ACTIVITIES[type]));
    const equip = [...(res?.machineCandidates?.map((m) => m.name) ?? []), ...(res?.equipment ?? [])].filter(Boolean);
    setREquip(Array.from(new Set(equip)).slice(0, 30));
    setAi(res);
    setStep("review");
  }

  async function runAI() {
    if (!website.trim() && !pasteText.trim() && !notes.trim() && images.length === 0) {
      setErr("Add a website, some text, or a photo first.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await importGym({ url: website.trim() || undefined, text: pasteText.trim() || undefined, notes: notes.trim() || undefined, images });
      setSource(images.length ? "image" : website.trim() ? "website" : "ai-import");
      if (res.urlFetchFailed && !pasteText.trim() && images.length === 0) {
        setErr("Couldn't read that website automatically — paste its text or upload a screenshot/flyer, then import again. (Showing best guess.)");
      }
      populateReview(res, true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "AI import failed.");
    } finally {
      setLoading(false);
    }
  }

  function manualReview() {
    if (!name.trim()) {
      setErr("Enter a gym name (or use AI import).");
      return;
    }
    setErr(null);
    populateReview(null, false);
  }

  function toggleAct(a: ActivityType) {
    setRActs((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function save() {
    const acts = ACTIVITY_TYPES.filter((a) => rActs.has(a));
    const loc: GymLocation = {
      id: `loc-${uid()}`,
      name: name.trim() || "New gym",
      nickname: rNickname.trim() || undefined,
      address: address.trim() || undefined,
      website: website.trim() || undefined,
      type: rType,
      hours: rHours.trim() || undefined,
      activities: acts.length ? acts : DEFAULT_ACTIVITIES[rType],
      equipmentCatalog: rEquip.length ? rEquip : undefined,
      cardioOptions: ai?.cardio?.length ? ai.cardio : undefined,
      freeWeightOptions: ai?.freeWeights?.length ? ai.freeWeights : undefined,
      classOptions: ai?.classes?.length ? ai.classes : undefined,
      notes: notes.trim() || undefined,
      confidence: ai?.confidence,
      needsReview: ai?.needsReview ?? false,
      createdFrom: source,
      lat: coords?.lat,
      lng: coords?.lng,
    };
    addLocation(loc);
    onSaved();
  }

  // ---------- INPUT STEP ----------
  if (step === "input") {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Add a gym"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button onClick={manualReview} className="min-h-[50px] rounded-xl border border-line font-semibold text-muted active:bg-surface2">Enter manually →</button>
            <button onClick={runAI} disabled={loading} className="min-h-[50px] rounded-xl bg-accent font-bold text-accent-ink active:scale-95 disabled:opacity-50">{loading ? "Reading…" : "✨ Import with AI"}</button>
          </div>
        }
      >
        {/* Find My Gym */}
        <button onClick={findMyGym} className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/50 bg-accent/10 py-3 text-sm font-bold text-accent active:scale-[0.99]">
          📍 Find My Gym
        </button>
        <p className="mt-1.5 text-[11px] text-faint">Location is used once to find nearby gyms. It’s never tracked, and only a gym you save keeps its location.</p>
        {geoStatus ? <p className="mt-1.5 rounded-lg bg-surface2 px-3 py-2 text-[12px] text-muted">{geoStatus}</p> : null}

        <div className="my-4 h-px bg-line" />

        <div className="flex flex-col gap-3">
          <label className="block"><span className={lbl}>Gym name</span><input className={inputCls} value={name} placeholder="Impact Zone Training Center" onChange={(e) => setName(e.target.value)} /></label>
          <label className="block"><span className={lbl}>City / state</span><input className={inputCls} value={address} placeholder="Odessa, TX" onChange={(e) => setAddress(e.target.value)} /></label>
          <label className="block"><span className={lbl}>Website URL</span><input className={inputCls} value={website} inputMode="url" placeholder="https://…" onChange={(e) => setWebsite(e.target.value)} /></label>
          <label className="block"><span className={lbl}>Paste website text (optional)</span><textarea className={`${inputCls} min-h-[70px] py-2`} value={pasteText} placeholder="Paste the gym’s page text if the URL won’t load" onChange={(e) => setPasteText(e.target.value)} /></label>
          <label className="block"><span className={lbl}>Notes (optional)</span><textarea className={`${inputCls} min-h-[56px] py-2`} value={notes} placeholder="Anything else — equipment, classes…" onChange={(e) => setNotes(e.target.value)} /></label>

          <div>
            <span className={lbl}>Flyer / floor map / photos (optional)</span>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              {images.length < 6 ? (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-2xl text-faint active:bg-surface2">
                  +
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }} />
                </label>
              ) : null}
            </div>
          </div>
          <p className="text-[11px] text-faint">⚠ AI import sends the website text / photos to OpenAI to read. Nothing is saved until you review and tap Save.</p>
          {err ? <p className="rounded-lg bg-bad/10 px-3 py-2 text-[12px] text-bad">{err}</p> : null}
        </div>
      </Sheet>
    );
  }

  // ---------- REVIEW STEP ----------
  return (
    <Sheet
      open
      onClose={onClose}
      title="Review gym"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setStep("input")} className="min-h-[50px] rounded-xl border border-line font-semibold text-muted active:bg-surface2">← Back</button>
          <button onClick={save} className="min-h-[50px] rounded-xl bg-accent font-bold text-accent-ink active:scale-95">Save gym profile</button>
        </div>
      }
    >
      {ai ? (
        <div className={`mb-3 rounded-lg px-3 py-2 text-[12px] ${ai.needsReview ? "bg-warn/10 text-warn" : "bg-good/10 text-good"}`}>
          {ai.needsReview ? "⚠ AI wasn’t fully sure — double-check everything below." : "AI detected the details below — confirm or fix, then save."}
          {typeof ai.confidence === "number" ? ` (confidence ${Math.round(ai.confidence * 100)}%)` : ""}
        </div>
      ) : null}
      {err ? <p className="mb-3 rounded-lg bg-bad/10 px-3 py-2 text-[12px] text-bad">{err}</p> : null}

      <div className="flex flex-col gap-3">
        <label className="block"><span className={lbl}>Name</span><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block"><span className={lbl}>Nickname (optional)</span><input className={inputCls} value={rNickname} placeholder="“The gym”, “Home”…" onChange={(e) => setRNickname(e.target.value)} /></label>

        <label className="block">
          <span className={lbl}>Type</span>
          <select className={inputCls} value={rType} onChange={(e) => setRType(e.target.value as GymType)}>
            {GYM_TYPES.map((t) => (<option key={t} value={t}>{GYM_TYPE_LABEL[t]}</option>))}
          </select>
        </label>

        <div>
          <span className={lbl}>Activities available here</span>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map((a) => {
              const on = rActs.has(a);
              return (
                <button key={a} onClick={() => toggleAct(a)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface2 text-muted"}`}>
                  {ACTIVITY_LABEL[a]}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block"><span className={lbl}>Hours (optional)</span><input className={inputCls} value={rHours} placeholder="Mon–Fri 5a–10p…" onChange={(e) => setRHours(e.target.value)} /></label>
        <label className="block"><span className={lbl}>Address (optional)</span><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></label>
        <label className="block"><span className={lbl}>Website (optional)</span><input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} /></label>

        <div>
          <span className={lbl}>Machines &amp; equipment</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {rEquip.map((m, i) => (
              <span key={`${m}-${i}`} className="flex items-center gap-1 rounded-full border border-line bg-surface2 px-2.5 py-1 text-xs">
                {m}
                <button aria-label={`remove ${m}`} className="text-faint active:text-bad" onClick={() => setREquip((p) => p.filter((_, j) => j !== i))}>✕</button>
              </span>
            ))}
            {rEquip.length === 0 ? <span className="text-[12px] text-faint">None detected — add any below.</span> : null}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={equipAdd} placeholder="Add a machine / equipment" onChange={(e) => setEquipAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && equipAdd.trim()) { setREquip((p) => [...p, equipAdd.trim()]); setEquipAdd(""); } }} />
            <button className="shrink-0 rounded-xl border border-line px-4 text-sm font-semibold active:bg-surface2" onClick={() => { if (equipAdd.trim()) { setREquip((p) => [...p, equipAdd.trim()]); setEquipAdd(""); } }}>Add</button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
