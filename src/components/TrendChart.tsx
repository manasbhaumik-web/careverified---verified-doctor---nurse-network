import React from 'react';

export interface TrendReading { id: string; ts: string; value1: number; value2?: number | null }

interface Props {
  /** Readings of ONE kind, any order. */
  readings: TrendReading[];
  label: string;
  unit: string;
  /** Blood pressure has two values: the second is drawn as a dashed line. */
  twoValues?: boolean;
}

const W = 640, H = 200, PAD = { l: 44, r: 16, t: 16, b: 34 };

const dateShort = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
const num = (n: number) => (Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));

/**
 * A plain line chart of the last readings of one kind. Drawn as an image with a spoken summary; the full table sits right beside it,
 * so nothing is only available in the picture. Needs two readings to show a trend.
 */
export default function TrendChart({ readings, label, unit, twoValues = false }: Props) {
  const pts = [...readings].sort((a, b) => a.ts.localeCompare(b.ts)).slice(-30);
  if (pts.length < 2) {
    return (
      <p className="text-xs text-slate-700 bg-slate-50 border border-dashed border-slate-300 p-4">
        {pts.length === 0 ? `No ${label.toLowerCase()} readings yet.` : `One ${label.toLowerCase()} reading so far.`} Add at least two to see a trend.
      </p>
    );
  }

  const t0 = new Date(pts[0].ts).getTime(), t1 = new Date(pts[pts.length - 1].ts).getTime();
  const all = pts.flatMap(p => (twoValues && p.value2 != null ? [p.value1, p.value2] : [p.value1]));
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi === lo) { hi += 1; lo -= 1; }
  const room = (hi - lo) * 0.12; lo -= room; hi += room;

  const x = (t: number) => PAD.l + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (pick: (p: TrendReading) => number | null | undefined) =>
    pts.filter(p => pick(p) != null).map(p => `${x(new Date(p.ts).getTime()).toFixed(1)},${y(pick(p) as number).toFixed(1)}`).join(' ');

  const first = pts[0], last = pts[pts.length - 1];
  const show = (p: TrendReading) => (twoValues && p.value2 != null ? `${num(p.value1)}/${num(p.value2)}` : num(p.value1));
  const summary = `${label}, ${pts.length} readings from ${dateShort(first.ts)} to ${dateShort(last.ts)}. First ${show(first)} ${unit}, latest ${show(last)} ${unit}. Lowest ${num(Math.min(...all))}, highest ${num(Math.max(...all))}.`;

  return (
    <figure className="m-0 max-w-[720px]">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="w-full h-auto bg-white border border-[color:var(--t-200)]">
        {[lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1].map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 4" />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#334155">{num(v)}</text>
          </g>
        ))}
        {twoValues && <polyline points={line(p => p.value2)} fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="6 4" />}
        <polyline points={line(p => p.value1)} fill="none" stroke="var(--t-600)" strokeWidth="2.5" />
        {pts.map(p => (
          <g key={p.id}>
            <circle cx={x(new Date(p.ts).getTime())} cy={y(p.value1)} r="3.5" fill="var(--t-600)" />
            {twoValues && p.value2 != null && <circle cx={x(new Date(p.ts).getTime())} cy={y(p.value2)} r="3" fill="#475569" />}
          </g>
        ))}
        <text x={PAD.l} y={H - 10} fontSize="12" fill="#334155">{dateShort(first.ts)}</text>
        <text x={W - PAD.r} y={H - 10} textAnchor="end" fontSize="12" fill="#334155">{dateShort(last.ts)}</text>
      </svg>
      <figcaption className="text-xs text-slate-700 mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span><strong>Latest:</strong> {show(last)} {unit}</span>
        <span><strong>Range:</strong> {num(Math.min(...all))} to {num(Math.max(...all))} {unit}</span>
        <span>{pts.length} readings{twoValues ? ' · solid line is the top number, dashed the bottom' : ''}</span>
      </figcaption>
    </figure>
  );
}
