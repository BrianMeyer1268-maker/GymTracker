"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppData, AvailabilityObservation, BodyCompEntry, Crowd, DayPlan, ExerciseLog, Machine, Phase, Readiness, StationEvent, SwitchReason, WorkoutGoal, WorkoutSession } from "./types";
import { loadData, saveData, seededDefault, uid, applyImport } from "./storage";
import { setPhoto, deletePhoto, uidPhoto } from "./photos";
import { todayISO, timeBucket } from "./date";

export type NewLog = Omit<ExerciseLog, "id" | "date" | "loggedAt" | "sessionId">;

interface Store {
  data: AppData;
  ready: boolean;
  setPhase: (p: Phase) => void;
  setReadiness: (r: Readiness) => void;
  setCrowd: (c: Crowd) => void;
  setGoal: (g: WorkoutGoal) => void;
  clearGoal: () => void;
  endWorkout: () => void;
  toggleBusy: (machineId: string) => void;
  markBecameBusy: (machineId: string) => void;
  recordSwitch: (machineId: string, reason: SwitchReason) => void;
  skipSlot: (index: number) => void;
  pickMachine: (id: string, fromSubstitute?: boolean) => void;
  setActiveMachine: (id?: string) => void;
  saveExercise: (log: NewLog) => void;
  addMachine: (m: Machine) => void;
  updateMachine: (id: string, patch: Partial<Machine>) => void;
  archiveMachine: (id: string) => void;
  setGymPhoto: (id: string, dataUrl: string) => void;
  removeGymPhoto: (id: string) => void;
  setFlag: (machineId: string, on: boolean) => void;
  upsertBodyComp: (e: BodyCompEntry) => void;
  deleteBodyComp: (id: string) => void;
  importBackup: (text: string) => void;
  replaceData: (d: AppData) => void;
}

const Ctx = createContext<Store | null>(null);

const byDate = (a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

function ensureToday(t: DayPlan | undefined): DayPlan {
  const date = todayISO();
  if (t && t.date === date) return { ...t };
  return { date, busy: [] };
}

function bump(sessions: WorkoutSession[], sid: string | undefined, fn: (s: WorkoutSession) => WorkoutSession): WorkoutSession[] {
  return sid ? sessions.map((s) => (s.id === sid ? fn(s) : s)) : sessions;
}

function pushObs(d: AppData, machineId: string, action: AvailabilityObservation["action"]): AvailabilityObservation[] {
  const dt = new Date();
  const session = d.sessions.find((s) => s.id === d.today?.sessionId);
  const obs: AvailabilityObservation = {
    id: uid(),
    machineId,
    action,
    at: Date.now(),
    dayOfWeek: dt.getDay(),
    bucket: timeBucket(dt),
    goal: d.today?.goal,
    crowd: session?.crowd,
  };
  return [...d.observations, obs].slice(-2000);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => seededDefault());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);

  const store = useMemo<Store>(() => {
    const patchToday = (fn: (t: DayPlan) => DayPlan) => setData((d) => ({ ...d, today: fn(ensureToday(d.today)) }));

    return {
      data,
      ready,
      setPhase: (p) => setData((d) => ({ ...d, phase: p })),
      setReadiness: (r) => patchToday((t) => ({ ...t, readiness: r })),
      setCrowd: (c) =>
        setData((d) => {
          const today = { ...ensureToday(d.today), crowd: c };
          const sessions = today.sessionId ? d.sessions.map((s) => (s.id === today.sessionId ? { ...s, crowd: c } : s)) : d.sessions;
          return { ...d, today, sessions };
        }),
      setGoal: (g) =>
        setData((d) => {
          const today: DayPlan = { ...ensureToday(d.today), goal: g, skipped: [], activeMachineId: undefined };
          if (today.sessionId && d.sessions.some((s) => s.id === today.sessionId)) {
            return { ...d, today, sessions: d.sessions.map((s) => (s.id === today.sessionId ? { ...s, goal: g } : s)) };
          }
          const dt = new Date();
          const session: WorkoutSession = {
            id: uid(),
            date: today.date,
            goal: g,
            startedAt: Date.now(),
            dayOfWeek: dt.getDay(),
            bucket: timeBucket(dt),
            crowd: today.crowd,
            busyCount: 0,
            subCount: 0,
            skipCount: 0,
            logCount: 0,
          };
          today.sessionId = session.id;
          return { ...d, today, sessions: [...d.sessions, session] };
        }),
      clearGoal: () => patchToday((t) => ({ ...t, goal: undefined, skipped: [], activeMachineId: undefined })),
      endWorkout: () =>
        setData((d) => {
          const sid = d.today?.sessionId;
          const sessions = sid
            ? d.sessions.map((s) => (s.id === sid ? { ...s, endedAt: Date.now() } : s)).filter((s) => s.id !== sid || s.logCount > 0)
            : d.sessions;
          return { ...d, sessions, today: undefined };
        }),
      toggleBusy: (id) =>
        setData((d) => {
          const t = ensureToday(d.today);
          const isOn = !t.busy.includes(id);
          const today = { ...t, busy: isOn ? [...t.busy, id] : t.busy.filter((x) => x !== id) };
          if (!isOn) return { ...d, today };
          return { ...d, today, sessions: bump(d.sessions, today.sessionId, (s) => ({ ...s, busyCount: s.busyCount + 1 })), observations: pushObs(d, id, "busy") };
        }),
      markBecameBusy: (id) =>
        setData((d) => {
          const t = ensureToday(d.today);
          const today = { ...t, busy: t.busy.includes(id) ? t.busy : [...t.busy, id], activeMachineId: undefined };
          return { ...d, today, sessions: bump(d.sessions, today.sessionId, (s) => ({ ...s, busyCount: s.busyCount + 1 })), observations: pushObs(d, id, "became-busy") };
        }),
      recordSwitch: (machineId, reason) =>
        setData((d) => {
          const dt = new Date();
          const evt: StationEvent = { id: uid(), machineId, reason, at: Date.now(), dayOfWeek: dt.getDay(), bucket: timeBucket(dt), goal: d.today?.goal, sessionId: d.today?.sessionId };
          const switchEvents = [...d.switchEvents, evt].slice(-1000);
          const marksBusy = reason === "busy" || reason === "became-occupied";
          if (!marksBusy) {
            return { ...d, switchEvents, today: d.today ? { ...d.today, activeMachineId: undefined } : d.today };
          }
          const t = ensureToday(d.today);
          const today = { ...t, busy: t.busy.includes(machineId) ? t.busy : [...t.busy, machineId], activeMachineId: undefined };
          return { ...d, switchEvents, today, sessions: bump(d.sessions, today.sessionId, (s) => ({ ...s, busyCount: s.busyCount + 1 })), observations: pushObs(d, machineId, "became-busy") };
        }),
      skipSlot: (index) =>
        setData((d) => {
          const t = ensureToday(d.today);
          const already = (t.skipped ?? []).includes(index);
          const today = { ...t, skipped: already ? t.skipped ?? [] : [...(t.skipped ?? []), index], activeMachineId: undefined };
          return { ...d, today, sessions: already ? d.sessions : bump(d.sessions, today.sessionId, (s) => ({ ...s, skipCount: s.skipCount + 1 })) };
        }),
      pickMachine: (id, fromSubstitute) =>
        setData((d) => {
          const today = { ...ensureToday(d.today), activeMachineId: id };
          const sessions = fromSubstitute ? bump(d.sessions, today.sessionId, (s) => ({ ...s, subCount: s.subCount + 1 })) : d.sessions;
          return { ...d, today, sessions, observations: pushObs(d, id, "available") };
        }),
      setActiveMachine: (id) => patchToday((t) => ({ ...t, activeMachineId: id })),
      saveExercise: (log) =>
        setData((d) => {
          const now = Date.now();
          const entry: ExerciseLog = { ...log, id: uid(), date: todayISO(), loggedAt: now, sessionId: d.today?.sessionId };
          // Only significant pain flags the movement; "none" clears it; "minor" leaves it as-is.
          const flagged =
            log.pain === "none"
              ? d.flagged.filter((x) => x !== log.machineId)
              : log.pain === "significant" && !d.flagged.includes(log.machineId)
                ? [...d.flagged, log.machineId]
                : d.flagged;
          return {
            ...d,
            logs: [...d.logs, entry],
            flagged,
            sessions: bump(d.sessions, d.today?.sessionId, (s) => ({ ...s, logCount: s.logCount + 1, endedAt: now })),
            today: d.today ? { ...d.today, activeMachineId: undefined } : d.today,
          };
        }),
      addMachine: (m) => setData((d) => ({ ...d, machines: [...d.machines, m] })),
      updateMachine: (id, patch) => setData((d) => ({ ...d, machines: d.machines.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      archiveMachine: (id) => setData((d) => ({ ...d, machines: d.machines.map((m) => (m.id === id ? { ...m, archived: true } : m)) })),
      setGymPhoto: (id, dataUrl) => {
        const old = data.machines.find((m) => m.id === id)?.gymPhotoId;
        const pid = uidPhoto();
        setPhoto(pid, dataUrl);
        if (old) deletePhoto(old);
        setData((d) => ({ ...d, machines: d.machines.map((m) => (m.id === id ? { ...m, gymPhotoId: pid } : m)) }));
      },
      removeGymPhoto: (id) => {
        const old = data.machines.find((m) => m.id === id)?.gymPhotoId;
        if (old) deletePhoto(old);
        setData((d) => ({ ...d, machines: d.machines.map((m) => (m.id === id ? { ...m, gymPhotoId: undefined } : m)) }));
      },
      setFlag: (machineId, on) =>
        setData((d) => ({ ...d, flagged: on ? Array.from(new Set([...d.flagged, machineId])) : d.flagged.filter((x) => x !== machineId) })),
      upsertBodyComp: (e) => setData((d) => ({ ...d, bodyComp: [...d.bodyComp.filter((x) => x.id !== e.id), e].sort(byDate) })),
      deleteBodyComp: (id) => setData((d) => ({ ...d, bodyComp: d.bodyComp.filter((e) => e.id !== id) })),
      importBackup: (text) => setData(applyImport(text)),
      replaceData: (nd) => setData(nd),
    };
  }, [data, ready]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}
