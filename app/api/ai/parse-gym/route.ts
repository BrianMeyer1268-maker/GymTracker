import { NextResponse } from "next/server";
import { accessOk, buildContent, callOpenAI, MOVEMENT_CATEGORIES } from "@/lib/aiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You catalogue a gym for a workout app, from photos (a flyer, the floor, equipment) and/or text (a website or the user's notes). Return ONLY a JSON object:
{
  "gymName": string | null,
  "hours": string | null,
  "machineBrands": string[],
  "cardioOptions": string[],
  "detectedEquipment": [
    { "name": string, "category": one of ${JSON.stringify(MOVEMENT_CATEGORIES)}, "brand": string | null, "beginnerLabel": string, "confidence": number }
  ],
  "confidence": number,
  "needsReview": boolean
}
Map each machine to the single closest "category" from the allowed list. "beginnerLabel" is plain words a beginner understands (e.g. "Chest push", "Back pull", "Leg press", "Hamstring curl", "Shoulder raise"). "confidence" is 0-1 per machine and overall. Set "needsReview" true when images are unclear/low quality or you are unsure. List only equipment you can actually see or that is named in the text — never invent machines.`;

export async function POST(req: Request) {
  if (!accessOk(req)) return NextResponse.json({ error: "Unauthorized — unlock the app first." }, { status: 401 });
  let body: { text?: unknown; notes?: unknown; images?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }
  const text = [typeof body.text === "string" ? body.text : "", typeof body.notes === "string" ? body.notes : ""].filter(Boolean).join("\n\n");
  const content = buildContent(text, body.images, 6);
  const r = await callOpenAI(SYSTEM, content);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ result: r.data });
}
