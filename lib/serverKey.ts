/**
 * SERVER ONLY — never import this from a client component.
 * The OpenAI key comes from process.env.OPENAI_API_KEY (loaded from .env.local
 * locally, or from Vercel env vars in production). The raw secret.key.json file
 * is no longer read at runtime — it was only used once to seed .env.local.
 */
export function getOpenAIKey(): string {
  return (process.env.OPENAI_API_KEY ?? "").trim();
}

/** The shared private access code (server-side only). Empty ⇒ gate disabled. */
export function getAccessCode(): string {
  return (process.env.IRON_COMPASS_ACCESS_CODE ?? "").trim();
}
