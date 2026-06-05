"use client";

import { useRef, useState } from "react";
import type { ZonePhoto } from "@/lib/types";
import { useStore } from "@/lib/store";
import { activeMachines } from "@/lib/catalog";
import { CATEGORY_ICON } from "@/lib/movement";
import { ZONE_TYPE_COLOR, ZONE_TYPE_ICON, zoneRects, zoneAtPoint, pinPos } from "@/lib/floormap";
import { getPhoto, setPhoto, uidPhoto, downscaleImage } from "@/lib/photos";
import { uid } from "@/lib/storage";
import Sheet from "./Sheet";
import PhotoTile from "./PhotoTile";
import MachineDetail from "./MachineDetail";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export default function GymMap({ onClose, showToast, focusMachineId }: { onClose: () => void; showToast: (m: string) => void; focusMachineId?: string }) {
  const { data, activeLocation, updateMachine, updateLocation } = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoZoneRef = useRef<string | null>(null);

  const machines = activeMachines(data.machines);
  const zones = activeLocation?.zones ?? [];
  const floorId = activeLocation?.floors?.[0]?.id;
  const rects = zoneRects(zones);
  const zonePhotos = activeLocation?.zonePhotos ?? [];

  const focusZone = focusMachineId ? machines.find((m) => m.id === focusMachineId)?.zoneId : undefined;
  const [mode, setMode] = useState<"view" | "place" | "move">("view");
  const [actMachine, setActMachine] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickQuery, setPickQuery] = useState("");
  const [zonePanel, setZonePanel] = useState<string | null>(focusZone ?? null);
  const [openMachine, setOpenMachine] = useState<string | null>(null);
  const [walk, setWalk] = useState<number | null>(null);
  const [wtSel, setWtSel] = useState<Set<string>>(new Set());

  // group machines by zone
  const byZone: Record<string, typeof machines> = {};
  machines.forEach((m) => {
    const z = m.zoneId && rects[m.zoneId] ? m.zoneId : "_";
    (byZone[z] ||= []).push(m);
  });

  // floor pins: explicitly placed machines + up to 4 ambient per zone
  const floorPins: { id: string; x: number; y: number; icon: string; name: string; placed: boolean }[] = [];
  for (const z of zones) {
    const ms = byZone[z.id] ?? [];
    ms.forEach((m, i) => {
      const placed = typeof m.mapX === "number" && typeof m.mapY === "number";
      if (placed || i < 4) {
        const p = pinPos(m, rects[z.id], i, ms.length);
        floorPins.push({ id: m.id, x: p.x, y: p.y, icon: CATEGORY_ICON[m.category], name: m.name, placed });
      }
    });
  }

  function placeAt(clientX: number, clientY: number) {
    if (!actMachine || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = clamp01((clientX - r.left) / r.width);
    const y = clamp01((clientY - r.top) / r.height);
    const zid = zoneAtPoint(rects, x, y) ?? machines.find((m) => m.id === actMachine)?.zoneId;
    updateMachine(actMachine, { mapX: x, mapY: y, zoneId: zid, floorId, locationNeedsReview: false });
    showToast("Pinned on map ✓");
    setActMachine(null);
    setMode("view");
  }

  async function onZonePhoto(file: File) {
    const zid = photoZoneRef.current;
    if (!zid || !activeLocation) return;
    try {
      const dataUrl = await downscaleImage(file, 1000, 0.72);
      const pid = uidPhoto();
      setPhoto(pid, dataUrl);
      const photo: ZonePhoto = { id: uid(), gymId: activeLocation.id, floorId, zoneId: zid, image: pid };
      updateLocation(activeLocation.id, { zonePhotos: [...zonePhotos, photo] });
      showToast("Area photo added ✓");
    } catch {
      showToast("Couldn't read that photo");
    }
  }
  function addZonePhoto(zid: string) {
    photoZoneRef.current = zid;
    fileRef.current?.click();
  }

  const open = openMachine ? machines.find((m) => m.id === openMachine) : undefined;
  const panelZone = zonePanel ? zones.find((z) => z.id === zonePanel) : undefined;
  const pickList = pickQuery.trim() ? machines.filter((m) => m.name.toLowerCase().includes(pickQuery.trim().toLowerCase())).slice(0, 20) : machines.slice(0, 20);

  // ---------- WALKTHROUGH ----------
  if (walk !== null) {
    const z = zones[walk];
    const zPhotos = zonePhotos.filter((p) => p.zoneId === z?.id);
    function commitZone() {
      wtSel.forEach((mid) => updateMachine(mid, { zoneId: z.id, floorId }));
      setWtSel(new Set());
      if (walk! + 1 < zones.length) setWalk(walk! + 1);
      else { setWalk(null); showToast("Walkthrough done ✓"); }
    }
    return (
      <Sheet open onClose={() => setWalk(null)} title={`🚶 Walkthrough · ${walk + 1}/${zones.length}`}>
        <div className="text-lg font-extrabold">{z?.name}</div>
        {z?.landmark ? <div className="text-[12px] text-faint">📍 {z.landmark}</div> : null}
        <button onClick={() => addZonePhoto(z.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/50 bg-accent/10 py-3 text-sm font-bold text-accent">📷 Take a wide photo of this area</button>
        {zPhotos.length ? (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {zPhotos.map((p) => {
              const src = getPhoto(p.image);
              return src ? <img key={p.id} src={src} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-line object-cover" /> : null;
            })}
          </div>
        ) : null}
        <div className="mt-4 mb-1.5 text-sm font-bold">Which machines are here?</div>
        <div className="grid grid-cols-3 gap-2">
          {machines.map((m) => {
            const on = wtSel.has(m.id) || m.zoneId === z.id;
            return (
              <button key={m.id} onClick={() => setWtSel((s) => { const n = new Set(s); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; })} className={`overflow-hidden rounded-lg border text-left ${on ? "border-accent" : "border-line"}`}>
                <div className="relative aspect-square w-full"><PhotoTile machine={m} />{on ? <span className="absolute right-1 top-1 rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">✓</span> : null}</div>
                <div className="truncate px-1 py-0.5 text-[9px] font-semibold">{m.name}</div>
              </button>
            );
          })}
        </div>
        <div className="sticky bottom-0 -mx-4 mt-3 border-t border-line bg-surface px-4 py-2">
          <button onClick={commitZone} className="min-h-[48px] w-full rounded-xl bg-accent font-bold text-accent-ink">{walk + 1 < zones.length ? "Save & next zone →" : "Finish walkthrough"}</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onZonePhoto(f); e.target.value = ""; }} />
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title={`🗺️ Map · ${activeLocation?.nickname || activeLocation?.name || "Gym"}`}>
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap gap-2">
        <button onClick={() => { setWalk(0); setWtSel(new Set()); }} className="rounded-lg border border-line bg-surface2 px-3 py-1.5 text-xs font-bold active:bg-surface3">🚶 Walkthrough</button>
        <button onClick={() => { setPickerOpen(true); setPickQuery(""); }} className="rounded-lg border border-line bg-surface2 px-3 py-1.5 text-xs font-bold active:bg-surface3">＋ Pin a machine</button>
        <button onClick={() => { setMode(mode === "move" ? "view" : "move"); setActMachine(null); }} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${mode === "move" ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface2"}`}>✋ Move</button>
      </div>

      {mode !== "view" ? (
        <div className="mb-2 rounded-lg bg-accent/10 px-3 py-1.5 text-[12px] font-semibold text-accent">
          {actMachine ? `Tap the map where “${machines.find((m) => m.id === actMachine)?.name}” is.` : "Tap a pin to move it."}
        </div>
      ) : null}

      {/* Floor canvas */}
      <div
        ref={canvasRef}
        onClick={(e) => { if (mode !== "view" && actMachine) placeAt(e.clientX, e.clientY); }}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-line bg-surface2"
      >
        {zones.map((z) => {
          const r = rects[z.id];
          const color = ZONE_TYPE_COLOR[z.zoneType];
          const photo = zonePhotos.find((p) => p.zoneId === z.id);
          const src = photo ? getPhoto(photo.image) : null;
          const count = (byZone[z.id] ?? []).length;
          return (
            <button
              key={z.id}
              onClick={(e) => { if (mode === "view") { e.stopPropagation(); setZonePanel(z.id); } }}
              className="absolute overflow-hidden border border-black/20 p-1 text-left"
              style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, background: src ? undefined : `${color}26`, boxShadow: z.id === focusZone ? `inset 0 0 0 2px ${color}` : undefined }}
            >
              {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
              <span className="relative z-10 text-[10px] font-bold leading-tight" style={{ color }}>
                {ZONE_TYPE_ICON[z.zoneType]} {z.name}
              </span>
              <span className="relative z-10 block text-[9px] text-faint">{count}</span>
            </button>
          );
        })}

        {/* Machine pins */}
        {floorPins.map((p) => (
          <button
            key={p.id}
            onClick={(e) => { e.stopPropagation(); if (mode === "move") setActMachine(p.id); else if (mode === "view") setOpenMachine(p.id); }}
            className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full border bg-bg/90 px-1 py-0.5 text-[9px] font-bold shadow ${actMachine === p.id ? "border-accent ring-2 ring-accent" : p.placed ? "border-accent/70" : "border-line"}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, maxWidth: "44%" }}
            title={p.name}
          >
            <span aria-hidden>{p.icon}</span>
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-faint">Tap a zone for its machines & area photos · pins with a blue ring are placed.</p>

      {/* Machine picker for "+ Pin" */}
      {pickerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setPickerOpen(false)}>
          <div className="mx-auto max-h-[70dvh] w-full max-w-app overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <input autoFocus value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder="Search machine to pin…" className="mb-2 min-h-[44px] w-full rounded-xl border border-line bg-surface2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            <div className="flex flex-col gap-1.5">
              {pickList.map((m) => (
                <button key={m.id} onClick={() => { setActMachine(m.id); setMode("place"); setPickerOpen(false); }} className="flex items-center gap-2 rounded-lg border border-line bg-surface2 p-1.5 text-left active:bg-surface3">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded"><PhotoTile machine={m} /></div>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Zone panel */}
      {panelZone ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setZonePanel(null)}>
          <div className="mx-auto max-h-[80dvh] w-full max-w-app overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-extrabold">{ZONE_TYPE_ICON[panelZone.zoneType]} {panelZone.name}</div>
            {panelZone.landmark ? <div className="text-[12px] text-faint">📍 {panelZone.landmark}</div> : null}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold">Area photos</span>
              <button onClick={() => addZonePhoto(panelZone.id)} className="rounded-lg border border-accent/50 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">📷 Add</button>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {zonePhotos.filter((p) => p.zoneId === panelZone.id).map((p) => {
                const src = getPhoto(p.image);
                return src ? <img key={p.id} src={src} alt="" className="h-24 w-36 shrink-0 rounded-lg border border-line object-cover" /> : null;
              })}
              {zonePhotos.filter((p) => p.zoneId === panelZone.id).length === 0 ? <span className="text-[12px] text-faint">No area photo yet — add a wide shot of this spot.</span> : null}
            </div>
            <div className="mt-4 mb-1.5 text-sm font-bold">Machines here · {(byZone[panelZone.id] ?? []).length}</div>
            <div className="grid grid-cols-3 gap-2">
              {(byZone[panelZone.id] ?? []).map((m) => (
                <button key={m.id} onClick={() => { setZonePanel(null); setOpenMachine(m.id); }} className="overflow-hidden rounded-lg border border-line text-left active:opacity-90">
                  <div className="aspect-square w-full"><PhotoTile machine={m} /></div>
                  <div className="truncate px-1 py-0.5 text-[9px] font-semibold">{m.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {open ? <MachineDetail machine={open} onClose={() => setOpenMachine(null)} showToast={showToast} /> : null}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onZonePhoto(f); e.target.value = ""; }} />
    </Sheet>
  );
}
