import { NextResponse } from "next/server";
import { getAccessCode } from "@/lib/serverKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const required = getAccessCode();
  if (!required) return NextResponse.json({ ok: true, gate: "disabled" });
  let code = "";
  try {
    const body = (await req.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    /* ignore */
  }
  if (code.trim() === required) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false }, { status: 401 });
}
