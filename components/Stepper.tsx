"use client";

export default function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  ariaLabel?: string;
}) {
  const clamp = (n: number) => (Number.isNaN(n) ? min : Math.max(min, Math.min(max, n)));
  const set = (n: number) => onChange(clamp(n));
  return (
    <div className="flex items-stretch gap-2">
      <button
        className="tap flex min-h-[52px] w-[52px] items-center justify-center rounded-xl border border-line bg-surface2 text-3xl font-semibold text-ink active:bg-surface3 active:scale-95"
        aria-label={`${ariaLabel ?? "value"} minus`}
        onClick={() => set(value - step)}
      >
        −
      </button>
      <div className="relative flex-1">
        <input
          className="bignum h-full min-h-[52px] w-full px-1"
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onFocus={(e) => e.target.select()}
          onChange={(e) => set(parseFloat(e.target.value))}
          aria-label={ariaLabel}
        />
        {unit ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-faint">{unit}</span>
        ) : null}
      </div>
      <button
        className="tap flex min-h-[52px] w-[52px] items-center justify-center rounded-xl border border-line bg-surface2 text-3xl font-semibold text-ink active:bg-surface3 active:scale-95"
        aria-label={`${ariaLabel ?? "value"} plus`}
        onClick={() => set(value + step)}
      >
        +
      </button>
    </div>
  );
}
