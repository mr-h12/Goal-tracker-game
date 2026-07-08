import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { XpBar, HealthBar } from '../components/XpBar';
import { repository } from '../lib/repository';
import { titleForLevel, xpProgress } from '../lib/leveling';
import { useGameStore } from '../store/useGameStore';
import type { Achievement, XpHistoryEntry } from '../types';

export function Character() {
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const users = useGameStore((s) => s.users);
  const completions = useGameStore((s) => s.completions);
  const [history, setHistory] = useState<XpHistoryEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const user = users.find((u) => u.id === currentPlayer);

  useEffect(() => {
    if (!currentPlayer) return;
    repository.getXpHistory(currentPlayer).then(setHistory);
    repository.getAchievements(currentPlayer).then(setAchievements);
  }, [currentPlayer, users]);

  if (!user) return null;

  const { level, percent } = xpProgress(user.xp);
  const doneToday = completions.filter(
    (c) => c.userId === user.id && c.status === 'done',
  ).length;
  const missToday = completions.filter(
    (c) => c.userId === user.id && c.status === 'miss',
  ).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="glow flex flex-col items-center gap-2 rounded-2xl border border-panel-border bg-panel p-6">
        <Avatar avatar={user.avatar} size={96} />
        <div className="text-2xl font-black">{user.username}</div>
        <div className="text-sm text-neutral-400">
          Level {level} · {titleForLevel(level)}
        </div>
        <div className="w-full max-w-xs">
          <XpBar xp={user.xp} />
        </div>
        <div className="mt-2 w-full max-w-xs">
          <div className="mb-1 text-xs text-neutral-400">Health</div>
          <HealthBar percent={percent} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-panel-border bg-panel p-3 text-center">
          <div className="text-2xl font-bold text-done">{doneToday}</div>
          <div className="text-xs text-neutral-400">Done today</div>
        </div>
        <div className="rounded-xl border border-panel-border bg-panel p-3 text-center">
          <div className="text-2xl font-bold text-miss">{missToday}</div>
          <div className="text-xs text-neutral-400">Missed today</div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Achievements
        </h2>
        {achievements.length === 0 ? (
          <p className="text-sm text-neutral-600">No achievements unlocked yet.</p>
        ) : (
          <ul className="space-y-1">
            {achievements.map((a) => (
              <li key={a.id} className="rounded-lg border border-panel-border bg-panel p-2 text-sm">
                🏅 {a.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
          XP History
        </h2>
        <ul className="space-y-1">
          {history.slice(0, 10).map((h) => (
            <li
              key={h.id}
              className="flex justify-between rounded-lg border border-panel-border bg-panel p-2 text-sm"
            >
              <span className="text-neutral-400">{h.reason}</span>
              <span className="font-bold text-neon">+{h.amount}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
