import type { MovementCategory } from "./types";
import { getAccessCode } from "./access";

export interface DetectedEquipment {
  name: string;
  category: MovementCategory | string;
  brand?: string | null;
  beginnerLabel?: string;
  confidence?: number;
}

export interface GymParse {
  gymName?: string | null;
  hours?: string | null;
  machineBrands?: string[];
  cardioOptions?: string[];
  detectedEquipment: DetectedEquipment[];
  confidence?: number;
  needsReview?: boolean;
}

export interface FitdaysParse {
  date?: string | null;
  weight?: number | null;
  bodyFatPercent?: number | null;
  skeletalMuscle?: number | null;
  visceralFat?: number | null;
  bodyWater?: number | null;
  bmr?: number | null;
  confidence?: number;
  needsReview?: boolean;
}

export interface MachineClass {
  friendlyName?: string;
  brand?: string | null;
  model?: string | null;
  movementCategory?: MovementCategory | string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  setupNotes?: string | null;
  confidence?: number;
  needsReview?: boolean;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-access-code": getAccessCode() },
    body: JSON.stringify(body),
  });
  const json = (await resp.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!resp.ok) throw new Error(json?.error || `Request failed (${resp.status})`);
  return json.result as T;
}

export async function parseGym(input: { images?: string[]; text?: string; notes?: string }): Promise<GymParse> {
  const r = await post<GymParse>("/api/ai/parse-gym", input);
  return { ...r, detectedEquipment: Array.isArray(r?.detectedEquipment) ? r.detectedEquipment : [] };
}

export function parseFitdays(input: { images?: string[]; text?: string }): Promise<FitdaysParse> {
  return post<FitdaysParse>("/api/ai/parse-fitdays", input);
}

export function classifyMachine(input: { images?: string[]; text?: string }): Promise<MachineClass> {
  return post<MachineClass>("/api/ai/classify-machine", input);
}
