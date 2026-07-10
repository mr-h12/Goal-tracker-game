import type { TaskCompletion, XpHistoryEntry } from '../types';

const DAY_MS = 86400000;

export const isoDay = (d: Date | string) =>
  (typeof d === 'string' ? new Date(d) : d).toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  return new Date(new Date(iso).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface PlayerStats {
  totalXp: number;
  avgXpPerActiveDay: number;
  completed: number;
  missed: number;
  completionRate: number; // 0..100
  activeDays: number;
}

export function computeStats(
  completions: TaskCompletion[],
  history: XpHistoryEntry[],
): PlayerStats {
  const completed = completions.filter((c) => c.status === 'done').length;
  const missed = completions.filter((c) => c.status === 'miss').length;
  const totalXp = history.reduce((sum, h) => sum + h.amount, 0);
  const activeDaySet = new Set(
    completions.filter((c) => c.status === 'done').map((c) => c.date),
  );
  const activeDays = activeDaySet.size;
  return {
    totalXp,
    completed,
    missed,
    completionRate: completed + missed > 0 ? (completed / (completed + missed)) * 100 : 0,
    activeDays,
    avgXpPerActiveDay: activeDays > 0 ? Math.round(totalXp / activeDays) : 0,
  };
}

// Per-day XP earned (from xp_history), bucketed to the given days.
export function xpByDay(history: XpHistoryEntry[], days: string[]): { day: string; xp: number }[] {
  const totals = new Map<string, number>();
  for (const h of history) {
    const day = isoDay(h.createdAt);
    totals.set(day, (totals.get(day) ?? 0) + h.amount);
  }
  return days.map((day) => ({ day, xp: totals.get(day) ?? 0 }));
}

export interface HeatCell {
  day: string;
  done: number;
  miss: number;
  xp: number;
  intensity: 0 | 1 | 2 | 3 | 4; // 0 empty, 1 low, 2 med, 3 high, 4 perfect
}

// Builds a heat cell per day for a single task's completions. `taskCount` is how
// many active quests the owner has, used to gauge a "perfect" day when the cell
// spans all tasks (owner-wide heatmap); for a single task it's effectively 1.
export function buildHeatmap(
  days: string[],
  completions: TaskCompletion[],
  perDayTarget: number,
): HeatCell[] {
  const byDay = new Map<string, { done: number; miss: number; xp: number }>();
  for (const c of completions) {
    const cur = byDay.get(c.date) ?? { done: 0, miss: 0, xp: 0 };
    if (c.status === 'done') { cur.done += 1; cur.xp += c.xpEarned; }
    else cur.miss += 1;
    byDay.set(c.date, cur);
  }
  const target = Math.max(1, perDayTarget);
  return days.map((day) => {
    const cur = byDay.get(day) ?? { done: 0, miss: 0, xp: 0 };
    const ratio = cur.done / target;
    let intensity: HeatCell['intensity'] = 0;
    if (cur.done === 0) intensity = 0;
    else if (ratio >= 1) intensity = 4;
    else if (ratio >= 0.66) intensity = 3;
    else if (ratio >= 0.33) intensity = 2;
    else intensity = 1;
    return { day, done: cur.done, miss: cur.miss, xp: cur.xp, intensity };
  });
}
