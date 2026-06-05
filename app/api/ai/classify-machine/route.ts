import { NextResponse } from "next/server";
import { accessOk, buildContent, callOpenAI, MOVEMENT_CATEGORIES } from "@/lib/aiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You identify a single piece of gym equipment from a photo (and an optional user note). Return ONLY a JSON object:
{
  "friendlyName": string,
  "brand": string | null,
  "model": string | null,
  "movementCategory": one of ${JSON.stringify(MOVEMENT_CATEGORIES)},
  "primaryMuscles": string[],
  "secondaryMuscles": string[],
  "setupNotes": string | null,
  "confidence": number,
  "needsReview": boolean
}
"friendlyName" is a clear common name (e.g. "Chest Press Machine"). "movementCategory" is the single closest from the allowed list. "setupNotes" is a short tip on how to set up / start (seat, handles, starting position). "confidence" 0-1. Set "needsReview" true if you are unsure or the photo is unclear. If you cannot tell what it is, use "Unknown machine" with low confidence and needsReview true.`;

export async function POST(req: Request) {
  if (!accessOk(req)) return NextResponse.json({ error: "Unauthorized — unlock the app first." }, { status: 401 });
  let body: { text?: unknown; images?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }
  const content = buildContent(typeof body.text === "string" ? body.text : "", body.images, 1);
  const r = await callOpenAI(SYSTEM, content);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ result: r.data });
}
