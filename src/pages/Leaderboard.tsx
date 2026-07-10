import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { repository } from '../lib/repository';
import { useGameStore } from '../store/useGameStore';
import { Avatar } from '../components/Avatar';
import type { LeaderboardEntry } from '../types';
import type { LeaderboardRange } from '../lib/repository/types';

const RANGES: { key: LeaderboardRange; label: string; icon: string }[] = [
  { key: 'daily', label: 'Day', icon: '📅' },
  { key: 'weekly', label: 'Week', icon: '📆' },
  { key: 'monthly', label: 'Month', icon: '🗓️' },
  { key: 'season', label: 'Season', icon: '🏆' },
  { key: 'all-time', label: 'All', icon: '👑' },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#facc15', '#94a3b8', '#cd7f32'];

export function Leaderboard() {
  const [range, setRange] = useState<LeaderboardRange>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const users = useGameStore((s) => s.users);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const season = useGameStore((s) => s.season);

  useEffect(() => {
    setLoading(true);
    repository.getLeaderboard(range).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, [range]);

  const handleKeyDown = (e: React.KeyboardEvent, key: LeaderboardRange) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setRange(key);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const idx = RANGES.findIndex((r) => r.key === range);
      setRange(RANGES[(idx + 1) % RANGES.length].key);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const idx = RANGES.findIndex((r) => r.key === range);
      setRange(RANGES[(idx - 1 + RANGES.length) % RANGES.length].key);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="glow-text text-xl font-black text-neon">LEADERBOARD</h1>

      {/* Season banner */}
      {season && (
        <div className="rounded-lg border border-panel-border bg-panel/50 px-3 py-2 text-center text-xs">
          <span className="text-neutral-400">Current Season: </span>
          <span className="font-bold text-neon">{season.name}</span>
        </div>
      )}

      {/* Range tabs */}
      <div className="flex gap-1 rounded-xl border border-panel-border bg-panel p-1" role="tablist">
        {RANGES.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={range === r.key}
            tabIndex={range === r.key ? 0 : -1}
            onClick={() => setRange(r.key)}
            onKeyDown={(e) => handleKeyDown(e, r.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-bold transition-all ${
              range === r.key
                ? 'bg-neon/20 text-neon shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span className="text-sm">{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neon" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.ul
            key={range}
            className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {entries.length === 0 ? (
              <li className="py-8 text-center text-sm text-neutral-600">
                No activity yet for this period.
              </li>
            ) : (
              entries.map((entry, i) => {
                const user = users.find((u) => u.id === entry.userId);
                const isMe = entry.userId === currentPlayer;
                const isTop3 = i < 3;

                return (
                  <motion.li
                    key={entry.userId}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isMe
                        ? 'border-neon/50 bg-neon/10'
                        : 'border-panel-border bg-panel'
                    } ${isTop3 ? 'glow' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={
                      isTop3
                        ? { boxShadow: `0 0 15px ${MEDAL_COLORS[i]}33` }
                        : undefined
                    }
                  >
                    {/* Rank */}
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold"
                      style={
                        isTop3
                          ? { background: `${MEDAL_COLORS[i]}22`, color: MEDAL_COLORS[i] }
                          : { color: '#737373' }
                      }
                    >
                      {MEDALS[i] ?? i + 1}
                    </div>

                    {/* Avatar */}
                    {user && (
                      <Avatar avatar={user.avatar} level={user.level} size={40} animate={false} />
                    )}

                    {/* Name */}
                    <div className="flex-1">
                      <div className="font-bold">{entry.username}</div>
                      {user && (
                        <div className="text-[10px] text-neutral-500">
                          Lv.{user.level}
                        </div>
                      )}
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <div
                        className="text-lg font-black"
                        style={{ color: isTop3 ? MEDAL_COLORS[i] : '#ff7a1a' }}
                      >
                        {entry.xp.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-neutral-500">XP</div>
                    </div>
                  </motion.li>
                );
              })
            )}
          </motion.ul>
        </AnimatePresence>
      )}

      <p className="text-center text-xs text-neutral-600">
        Daily winner earns a bonus +50 XP, awarded automatically at day's end.
      </p>
    </div>
  );
}
