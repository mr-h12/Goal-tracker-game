import { useEffect, useMemo, useState } from 'react';
import { repository } from '../lib/repository';
import { useGameStore } from '../store/useGameStore';
import {
  addDays,
  buildHeatmap,
  computeStats,
  daysBetween,
  isoDay,
  xpByDay,
} from '../lib/stats';
import { XpGraph } from '../components/XpGraph';
import { HabitHeatmapCard } from '../components/Heatmap';
import type { TaskCompletion, XpHistoryEntry } from '../types';

type GraphRange = 'daily' | 'weekly' | 'monthly' | 'season';
type HeatRange = 'year' | 'season' | '30d' | '90d';

const GRAPH_WINDOW_DAYS: Record<GraphRange, number> = { daily: 14, weekly: 56, monthly: 90, season: 0 };
const HEAT_WINDOW_DAYS: Record<HeatRange, number> = { year: 365, season: 0, '30d': 30, '90d': 90 };

// Consecutive-day streak (ending today/yesterday) for a single task's completions.
function taskStreak(completions: TaskCompletion[]): number {
  const days = [...new Set(completions.filter((c) => c.status === 'done').map((c) => c.date))].sort();
  if (days.length === 0) return 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    prev = d;
  }
  const today = isoDay(new Date());
  return prev === today || prev === addDays(today, -1) ? run : 0;
}

export function Stats() {
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const tasks = useGameStore((s) => s.tasks);
  const season = useGameStore((s) => s.season);

  const [history, setHistory] = useState<XpHistoryEntry[]>([]);
  const [yearCompletions, setYearCompletions] = useState<TaskCompletion[]>([]);
  const [graphRange, setGraphRange] = useState<GraphRange>('monthly');
  const [heatRange, setHeatRange] = useState<HeatRange>('90d');
  const [loading, setLoading] = useState(true);

  const today = isoDay(new Date());
  const seasonStart = season?.startDate ?? addDays(today, -90);

  useEffect(() => {
    if (!currentPlayer) return;
    setLoading(true);
    const from = addDays(today, -365);
    Promise.all([
      repository.getXpHistory(currentPlayer),
      repository.getCompletionsInRange(currentPlayer, from, today),
    ])
      .then(([h, c]) => {
        setHistory(h);
        setYearCompletions(c);
      })
      .finally(() => setLoading(false));
  }, [currentPlayer, today]);

  const myTasks = useMemo(
    () => tasks.filter((t) => t.ownerId === currentPlayer && t.active),
    [tasks, currentPlayer],
  );

  // ---- heatmap window ----
  const heatFrom = heatRange === 'season' ? seasonStart : addDays(today, -(HEAT_WINDOW_DAYS[heatRange] - 1));
  const heatDays = daysBetween(heatFrom, today);
  const windowCompletions = yearCompletions.filter((c) => c.date >= heatFrom && c.date <= today);

  // ---- summary stats over the heatmap window ----
  const windowHistory = history.filter((h) => isoDay(h.createdAt) >= heatFrom && isoDay(h.createdAt) <= today);
  const stats = computeStats(windowCompletions, windowHistory);
  const me = useGameStore((s) => s.users.find((u) => u.id === currentPlayer));

  // ---- graph window ----
  const graphFrom = graphRange === 'season' ? seasonStart : addDays(today, -(GRAPH_WINDOW_DAYS[graphRange] - 1));
  const graphDays = daysBetween(graphFrom, today);
  const graphPoints = xpByDay(history, graphDays);

  if (!currentPlayer) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="glow-text text-xl font-black text-neon">STATISTICS</h1>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neon" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="glow-text text-xl font-black text-neon">STATISTICS</h1>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total XP (window)" value={stats.totalXp} accent />
        <StatTile label="Avg XP / active day" value={stats.avgXpPerActiveDay} />
        <StatTile label="Completed" value={stats.completed} className="text-done" />
        <StatTile label="Missed" value={stats.missed} className="text-miss" />
        <StatTile label="Completion %" value={`${Math.round(stats.completionRate)}%`} />
        <StatTile label="Active days" value={stats.activeDays} />
        <StatTile label="Current streak" value={`🔥 ${me?.currentStreak ?? 0}`} />
        <StatTile label="Longest streak" value={`🏆 ${me?.longestStreak ?? 0}`} />
      </div>

      {/* XP growth graph */}
      <div className="glow rounded-2xl border border-panel-border bg-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">XP Growth</h2>
          <Segmented
            options={['daily', 'weekly', 'monthly', 'season'] as GraphRange[]}
            value={graphRange}
            onChange={setGraphRange}
            labels={{ daily: 'Day', weekly: 'Week', monthly: 'Month', season: 'Season' }}
          />
        </div>
        <XpGraph points={graphPoints} />
      </div>

      {/* Heatmap filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Habit Heatmaps</h2>
        <Segmented
          options={['30d', '90d', 'season', 'year'] as HeatRange[]}
          value={heatRange}
          onChange={setHeatRange}
          labels={{ '30d': '30d', '90d': '90d', season: 'Season', year: 'Year' }}
        />
      </div>

      {/* Per-quest heatmap cards */}
      <div className="flex flex-col gap-3">
        {myTasks.map((task) => {
          const taskCompletions = windowCompletions.filter((c) => c.taskId === task.id);
          const allTaskCompletions = yearCompletions.filter((c) => c.taskId === task.id);
          const cells = buildHeatmap(heatDays, taskCompletions, 1);
          return (
            <HabitHeatmapCard
              key={task.id}
              icon={task.icon}
              name={task.name}
              description={task.category}
              streak={taskStreak(allTaskCompletions)}
              completionCount={taskCompletions.filter((c) => c.status === 'done').length}
              cells={cells}
            />
          );
        })}
        {myTasks.length === 0 && (
          <p className="text-sm text-neutral-600">No active quests to chart yet.</p>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  className = '',
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-panel-border bg-panel p-3 ${accent ? 'glow' : ''}`}>
      <div className={`text-xl font-black ${accent ? 'text-neon' : ''} ${className}`}>{value}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  const handleKeyDown = (e: React.KeyboardEvent, opt: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(opt);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = options.indexOf(value);
      const next = options[(idx + 1) % options.length];
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = options.indexOf(value);
      const prev = options[(idx - 1 + options.length) % options.length];
      onChange(prev);
    }
  };

  return (
    <div
      className="flex overflow-hidden rounded-lg border border-panel-border text-[11px]"
      role="tablist"
      aria-label="Range selector"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={value === opt}
          tabIndex={value === opt ? 0 : -1}
          onClick={() => onChange(opt)}
          onKeyDown={(e) => handleKeyDown(e, opt)}
          className={`px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-neon active:scale-95 ${
            value === opt ? 'bg-neon/20 font-bold text-neon' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}
