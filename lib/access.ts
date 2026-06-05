// Client-side access state. Stores the (validated) shared access code so it can
// be sent with AI requests. This is NOT the OpenAI key — that never leaves the server.
const KEY = "ironcompass:access";

export function getAccessCode(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setAccessCode(code: string): void {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    /* ignore */
  }
}

export function clearAccessCode(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function isUnlocked(): boolean {
  return !!getAccessCode();
}

/** Validate a code against the server. Returns true on success (and stores it). */
export async function unlock(code: string): Promise<boolean> {
  const resp = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (resp.ok) {
    setAccessCode(code.trim());
    return true;
  }
  return false;
}
