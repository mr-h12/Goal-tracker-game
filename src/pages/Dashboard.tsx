import { PlayerCard } from '../components/PlayerCard';
import { SeasonBanner } from '../components/SeasonBanner';
import { useGameStore } from '../store/useGameStore';

export function Dashboard() {
  const users = useGameStore((s) => s.users);
  const tasks = useGameStore((s) => s.tasks);
  const completions = useGameStore((s) => s.completions);
  const season = useGameStore((s) => s.season);
  const yesterdayWinner = useGameStore((s) => s.yesterdayWinner);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="glow-text text-xl font-black text-neon">DASHBOARD</h1>

      {season && <SeasonBanner season={season} />}

      {yesterdayWinner?.username && (
        <div className="rounded-2xl border border-neon/30 bg-panel p-3 text-center text-sm">
          <span className="text-neutral-400">👑 Winner of yesterday: </span>
          <span className="font-bold text-neon">{yesterdayWinner.username}</span>
          <span className="text-neutral-400"> · {yesterdayWinner.xp} XP · +50 bonus</span>
        </div>
      )}

      {users.map((user) => (
        <PlayerCard key={user.id} user={user} tasks={tasks} completions={completions} />
      ))}
    </div>
  );
}
