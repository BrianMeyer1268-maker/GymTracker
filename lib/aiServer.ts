import { getOpenAIKey, getAccessCode } from "./serverKey";
import { CATEGORY_LABEL } from "./movement";

export const MOVEMENT_CATEGORIES = Object.keys(CATEGORY_LABEL);
export const MODEL = "gpt-4o-mini"; // cheap vision model — sufficient for this task

export type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

/** Private access gate. Empty env code ⇒ gate disabled (open). */
export function accessOk(req: Request): boolean {
  const required = getAccessCode();
  if (!required) return true;
  return req.headers.get("x-access-code") === required;
}

export function buildContent(text: string | undefined, images: unknown, maxImages: number): Part[] {
  const content: Part[] = [];
  const t = typeof text === "string" ? text.slice(0, 6000).trim() : "";
  if (t) content.push({ type: "text", text: t });
  const imgs = Array.isArray(images) ? (images as unknown[]).filter((u): u is string => typeof u === "string" && u.startsWith("data:image")).slice(0, maxImages) : [];
  for (const url of imgs) content.push({ type: "image_url", image_url: { url } });
  return content;
}

type CallResult = { ok: true; data: unknown; usage: unknown } | { ok: false; status: number; error: string };

export async function callOpenAI(system: string, content: Part[]): Promise<CallResult> {
  const key = getOpenAIKey();
  if (!key) return { ok: false, status: 500, error: "OpenAI key not configured on the server." };
  if (content.length === 0) return { ok: false, status: 400, error: "Add a photo or some text first." };

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 1600,
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
    });
  } catch {
    return { ok: false, status: 502, error: "Couldn't reach OpenAI." };
  }
  if (!resp.ok) return { ok: false, status: 502, error: `OpenAI error ${resp.status}` };

  const json = await resp.json().catch(() => null);
  const out = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return { ok: true, data: JSON.parse(out), usage: json?.usage ?? null };
  } catch {
    return { ok: false, status: 502, error: "Model did not return valid JSON." };
  }
}
