import { NextResponse } from "next/server";
import { accessOk, buildContent, callOpenAI } from "@/lib/aiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You read a body-composition result (a Fitdays / InBody / smart-scale screenshot) or pasted text. Extract the measurements. Return ONLY a JSON object:
{
  "date": "YYYY-MM-DD" | null,
  "weight": number | null,
  "bodyFatPercent": number | null,
  "skeletalMuscle": number | null,
  "visceralFat": number | null,
  "bodyWater": number | null,
  "bmr": number | null,
  "confidence": number,
  "needsReview": boolean
}
Values are plain numbers in the units shown (no unit text in the value). "bodyFatPercent" and "bodyWater" are percentages. "bmr" is calories. Use null for anything not present. "confidence" 0-1. Set "needsReview" true if the image is unclear or values are ambiguous.`;

export async function POST(req: Request) {
  if (!accessOk(req)) return NextResponse.json({ error: "Unauthorized — unlock the app first." }, { status: 401 });
  let body: { text?: unknown; images?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }
  const content = buildContent(typeof body.text === "string" ? body.text : "", body.images, 2);
  const r = await callOpenAI(SYSTEM, content);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ result: r.data });
}
