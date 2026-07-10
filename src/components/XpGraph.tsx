import { motion } from 'framer-motion';

interface Point {
  day: string;
  xp: number;
}

// Lightweight animated SVG area chart — cumulative XP over the given points.
export function XpGraph({ points, cumulative = true }: { points: Point[]; cumulative?: boolean }) {
  const W = 320;
  const H = 120;
  const PAD = 6;

  if (points.length === 0) {
    return <div className="py-8 text-center text-sm text-neutral-600">No data yet.</div>;
  }

  let running = 0;
  const series = points.map((p) => {
    running += p.xp;
    return cumulative ? running : p.xp;
  });

  const max = Math.max(1, ...series);
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const x = (i: number) => PAD + i * stepX;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const area = `${line} L ${x(series.length - 1)} ${H - PAD} L ${x(0)} ${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="XP growth">
      <defs>
        <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff7a1a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ff7a1a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill="url(#xpFill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="#ff7a1a"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 3px #ff7a1a88)' }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />
    </svg>
  );
}
