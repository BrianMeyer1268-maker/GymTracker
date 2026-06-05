// Remembers — on THIS device, in a cookie — which PIN-locked profiles have been
// unlocked, so the PIN isn't re-entered on every app open. The cookie expires
// after 30 days; "Re-lock" (or clearing site data) forces the PIN again. This is
// a convenience tradeoff: a remembered device trusts whoever holds it.

const COOKIE = "ic_unlocked";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function read(): string[] {
  if (typeof document === "undefined") return [];
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!entry) return [];
  try {
    return decodeURIComponent(entry.slice(COOKIE.length + 1)).split(",").filter(Boolean);
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof document === "undefined") return;
  const val = encodeURIComponent(Array.from(new Set(ids)).join(","));
  document.cookie = `${COOKIE}=${val}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function isUnlockRemembered(id: string): boolean {
  return read().includes(id);
}

export function rememberUnlock(id: string): void {
  write([...read(), id]);
}

export function forgetUnlock(id: string): void {
  write(read().filter((x) => x !== id));
}

export function forgetAllUnlocks(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
