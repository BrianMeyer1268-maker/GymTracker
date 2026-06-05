import { NextResponse } from "next/server";
import { getOpenAIKey } from "@/lib/serverKey";
import { CATEGORY_LABEL } from "@/lib/movement";

export const runtime = "nodejs"; // needs the filesystem to read the key
export const dynamic = "force-dynamic";

const MODEL = "gpt-4o-mini";
const CATS = Object.keys(CATEGORY_LABEL);

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

function gymPrompt(): string {
  return `You catalogue gym equipment for a workout app. From the provided photos and/or text (a gym flyer, floor photo, equipment photos, a website, or a written description), identify the distinct STRENGTH and CARDIO machines.
Return ONLY a JSON object of this shape:
{
  "gymName": string | null,
  "brands": string[],
  "notes": string | null,
  "machines": [
    {
      "name": string,
      "brand": string | null,
      "category": one of ${JSON.stringify(CATS)},
      "primaryMuscles": string[],
      "beginnerLabel": string,
      "confidence": "confirmed" | "likely" | "unknown"
    }
  ]
}
Pick the single closest "category" from the allowed list for every machine. "beginnerLabel" must be plain words a beginner understands (e.g. "Chest push", "Back pull", "Leg press", "Hamstring curl", "Shoulder raise"). If a machine's name is unreadable, use "Unknown machine" with confidence "unknown". Only list equipment you can actually see or that is named in the text — do not invent machines.`;
}

function bodyPrompt(): string {
  return `You read body-composition results (e.g. a Fitdays or InBody scale screenshot) or text. Extract the measurements.
Return ONLY a JSON object:
{ "date": "YYYY-MM-DD" | null, "weight": number | null, "bodyFat": number | null, "skeletalMuscle": number | null, "visceralFat": number | null, "waist": number | null, "units": "lb" | "kg" | null, "notes": string | null }
"weight" and "skeletalMuscle" are numbers in the shown unit. "bodyFat" is a percentage number. Put null for anything not present. Values must be plain numbers with no units.`;
}

export async function POST(req: Request) {
  const key = getOpenAIKey();
  if (!key) return NextResponse.json({ error: "No OpenAI key configured on the server." }, { status: 500 });

  let body: { kind?: string; images?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  const kind = body.kind === "body" ? "body" : "gym";
  const images = Array.isArray(body.images) ? (body.images as string[]).filter((u) => typeof u === "string" && u.startsWith("data:image")).slice(0, 6) : [];
  const text = typeof body.text === "string" ? body.text.slice(0, 6000) : "";
  if (images.length === 0 && !text.trim()) {
    return NextResponse.json({ error: "Add at least one photo or some text first." }, { status: 400 });
  }

  const content: Part[] = [];
  if (text.trim()) content.push({ type: "text", text: text.trim() });
  for (const url of images) content.push({ type: "image_url", image_url: { url } });

  const payload = {
    model: MODEL,
    response_format: { type: "json_object" as const },
    temperature: 0,
    max_tokens: 1600,
    messages: [
      { role: "system", content: kind === "body" ? bodyPrompt() : gymPrompt() },
      { role: "user", content },
    ],
  };

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
  } catch {
    return NextResponse.json({ error: "Couldn't reach OpenAI." }, { status: 502 });
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json({ error: `OpenAI error ${resp.status}`, detail: detail.slice(0, 300) }, { status: 502 });
  }

  const json = await resp.json().catch(() => null);
  const out = json?.choices?.[0]?.message?.content ?? "{}";
  let result: unknown;
  try {
    result = JSON.parse(out);
  } catch {
    result = { error: "Model did not return valid JSON.", raw: String(out).slice(0, 500) };
  }
  return NextResponse.json({ kind, result, usage: json?.usage ?? null });
}
