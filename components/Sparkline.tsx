"use client";

// Minimal dependency-free SVG line chart for body-comp trends.
export default function Sparkline({ values, className = "text-accent", height = 40 }: { values: number[]; className?: string; height?: number }) {
  if (values.length < 2) {
    return <div className="text-[11px] text-faint">Need 2+ entries to chart</div>;
  }
  const w = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${w},${height}`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`h-10 w-full ${className}`} aria-hidden>
      <polygon points={area} fill="currentColor" opacity={0.12} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r={2.6} fill="currentColor" />
    </svg>
  );
}
