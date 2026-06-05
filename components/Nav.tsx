"use client";

export type Tab = "today" | "machines" | "timing" | "body" | "stats";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "🧭" },
  { id: "machines", label: "Machines", icon: "🏋️" },
  { id: "timing", label: "Timing", icon: "🕒" },
  { id: "body", label: "Body", icon: "⚖️" },
  { id: "stats", label: "Stats", icon: "📊" },
];

export default function Nav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2 border-t border-line bg-bg/85 px-2 pb-safe pt-1.5 backdrop-blur-lg">
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`tap flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold ${
                on ? "text-accent" : "text-faint"
              }`}
              aria-current={on ? "page" : undefined}
            >
              <span className={`text-lg ${on ? "drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" : ""}`} aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
