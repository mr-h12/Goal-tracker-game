import { useEffect, useState } from 'react';
import { repository } from '../lib/repository';
import type { LeaderboardEntry } from '../types';

const RANGES = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
] as const;

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard() {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    repository.getLeaderboard(range).then(setEntries);
  }, [range]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="glow-text text-xl font-black text-neon">LEADERBOARD</h1>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-bold ${
              range === r.key
                ? 'glow border-neon bg-neon/20 text-neon'
                : 'border-panel-border text-neutral-400'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <li
            key={entry.userId}
            className="glow flex items-center justify-between rounded-xl border border-panel-border bg-panel p-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{MEDALS[i] ?? `#${i + 1}`}</span>
              <span className="font-bold">{entry.username}</span>
            </div>
            <span className="font-bold text-neon">{entry.xp} XP</span>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-neutral-600">
        Daily winner earns a bonus +50 XP, awarded automatically at day's end.
      </p>
    </div>
  );
}
