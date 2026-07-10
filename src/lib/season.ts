import type { Season } from '../types';

const DAY_MS = 86400000;

export interface SeasonProgress {
  daysRemaining: number;
  daysTotal: number;
  daysElapsed: number;
  percent: number;
  hasEnded: boolean;
}

export function seasonProgress(season: Season, now = new Date()): SeasonProgress {
  const start = new Date(season.startDate).getTime();
  const end = new Date(season.endDate).getTime();
  const today = new Date(now.toISOString().slice(0, 10)).getTime();

  const daysTotal = Math.max(1, Math.round((end - start) / DAY_MS));
  const daysElapsed = Math.min(daysTotal, Math.max(0, Math.round((today - start) / DAY_MS)));
  const daysRemaining = Math.max(0, Math.round((end - today) / DAY_MS));
  const percent = Math.min(100, Math.max(0, (daysElapsed / daysTotal) * 100));

  return { daysRemaining, daysTotal, daysElapsed, percent, hasEnded: today > end };
}
