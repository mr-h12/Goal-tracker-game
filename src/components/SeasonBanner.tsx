import { motion } from 'framer-motion';
import { seasonProgress } from '../lib/season';
import type { Season } from '../types';

export function SeasonBanner({ season }: { season: Season }) {
  const { daysRemaining, percent, hasEnded } = seasonProgress(season);

  return (
    <div className="glow rounded-2xl border border-neon/40 bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="glow-text text-lg font-black text-neon">🏆 {season.name}</span>
        <span className="text-sm font-semibold text-neutral-300">
          {hasEnded ? 'Season Finished' : `${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Remaining`}
        </span>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-panel-border bg-black/40">
        <motion.div
          className="glow h-full rounded-full bg-neon"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
      </div>
      <div className="mt-1 text-right text-[11px] text-neutral-500">{Math.round(percent)}% Complete</div>
    </div>
  );
}
