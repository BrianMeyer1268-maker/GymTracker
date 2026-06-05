import type { MachineConfidence, MovementCategory } from "./types";

export interface DetectedMachine {
  name: string;
  brand?: string | null;
  category: MovementCategory | string;
  primaryMuscles?: string[];
  beginnerLabel?: string;
  confidence?: MachineConfidence;
}

export interface GymResult {
  gymName?: string | null;
  brands?: string[];
  notes?: string | null;
  machines: DetectedMachine[];
}

export interface BodyResult {
  date?: string | null;
  weight?: number | null;
  bodyFat?: number | null;
  skeletalMuscle?: number | null;
  visceralFat?: number | null;
  waist?: number | null;
  units?: string | null;
  notes?: string | null;
}

async function call(kind: "gym" | "body", input: { images?: string[]; text?: string }): Promise<unknown> {
  const resp = await fetch("/api/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, images: input.images ?? [], text: input.text ?? "" }),
  });
  const json = (await resp.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!resp.ok) throw new Error(json?.error || `Request failed (${resp.status})`);
  return json.result;
}

export async function interpretGym(input: { images?: string[]; text?: string }): Promise<GymResult> {
  const r = (await call("gym", input)) as GymResult;
  return { ...r, machines: Array.isArray(r?.machines) ? r.machines : [] };
}

export async function interpretBody(input: { images?: string[]; text?: string }): Promise<BodyResult> {
  return (await call("body", input)) as BodyResult;
}
