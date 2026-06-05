"use client";

export interface SegOption<T extends string> {
  value: T;
  label: string;
  sub?: string;
  /** Tailwind classes applied when selected (static strings so Tailwind keeps them). */
  selectedClass?: string;
}

interface Props<T extends string> {
  options: SegOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  columns?: number;
}

export default function Segmented<T extends string>({ options, value, onChange, columns }: Props<T>) {
  const cols = columns ?? options.length;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        const selected = o.selectedClass ?? "bg-accent text-accent-ink border-accent";
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`tap flex min-h-[48px] flex-col items-center justify-center rounded-xl border px-2 py-2 text-sm font-bold leading-tight transition ${
              on ? selected : "border-line bg-surface2 text-muted active:bg-surface3"
            }`}
          >
            {o.label}
            {o.sub ? <span className="text-[10.5px] font-medium opacity-80">{o.sub}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
