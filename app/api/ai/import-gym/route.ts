import { NextResponse } from "next/server";
import { accessOk, buildContent, callOpenAI } from "@/lib/aiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GYM_TYPES = ["machine", "mixed", "combat", "class", "free-weight", "cardio", "home", "outdoor"];

const SYSTEM = `You build a gym/location profile for a workout app from a website's text, pasted text, a flyer, a floor map, gym photos, and/or the user's notes. Return ONLY a JSON object:
{
  "name": string | null,
  "address": string | null,
  "website": string | null,
  "type": one of ${JSON.stringify(GYM_TYPES)},
  "hours": string | null,
  "activities": string[],
  "equipment": string[],
  "cardio": string[],
  "freeWeights": string[],
  "classes": string[],
  "machineCandidates": [ { "name": string, "confidence": number } ],
  "confidence": number,
  "needsReview": boolean
}
Pick the single best "type" for the place. "activities" are the classes/training offered (e.g. "Kickboxing", "BJJ", "Free weights", "Treadmills"). Only list things actually present in the input — never invent equipment, machines or classes. If the input is thin, unclear, or the website couldn't be read, set "needsReview" true and lower "confidence". Keep arrays concise.`;

/** Best-effort single-page fetch — NO crawling, short timeout, text only. */
async function fetchSiteText(url: string): Promise<string> {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const resp = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": "IronCompass/1.0 (+gym-import; one-time)" },
    });
    clearTimeout(timer);
    if (!resp.ok) return "";
    const html = await resp.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  if (!accessOk(req)) return NextResponse.json({ error: "Unauthorized — unlock the app first." }, { status: 401 });
  let body: { url?: unknown; text?: unknown; notes?: unknown; images?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const pasted = typeof body.text === "string" ? body.text : "";
  const notes = typeof body.notes === "string" ? body.notes : "";
  const images = body.images;

  let siteText = "";
  let urlFetchFailed = false;
  if (url && !pasted) {
    siteText = await fetchSiteText(url);
    if (!siteText) urlFetchFailed = true;
  }

  const text = [
    url ? `Website: ${url}` : "",
    siteText ? `Website text: ${siteText}` : "",
    pasted ? `Pasted text: ${pasted}` : "",
    notes ? `User notes: ${notes}` : "",
    urlFetchFailed ? "(The website could not be fetched automatically — rely on any pasted text or images.)" : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const hasImages = Array.isArray(images) && images.length > 0;
  if (!text && !hasImages) {
    return NextResponse.json({ error: "Add a website, some text, or a photo first." }, { status: 400 });
  }

  const content = buildContent(text, images, 6);
  const r = await callOpenAI(SYSTEM, content);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

  const base = r.data && typeof r.data === "object" ? (r.data as Record<string, unknown>) : {};
  return NextResponse.json({ result: { ...base, website: base.website || url || undefined, urlFetchFailed } });
}
