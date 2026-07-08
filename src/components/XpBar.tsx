import { motion } from 'framer-motion';
import { xpProgress } from '../lib/leveling';

export function XpBar({ xp }: { xp: number }) {
  const { currentXp, xpToNext, percent } = xpProgress(xp);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span>XP</span>
        <span>
          {currentXp} / {xpToNext}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-panel-border bg-panel">
        <motion.div
          className="glow h-full rounded-full bg-neon"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
      </div>
    </div>
  );
}

export function HealthBar({ percent }: { percent: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full border border-panel-border bg-panel">
      <motion.div
        className="h-full rounded-full bg-hp"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      />
    </div>
  );
}
