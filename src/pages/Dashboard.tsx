import { PlayerCard } from '../components/PlayerCard';
import { useGameStore } from '../store/useGameStore';

export function Dashboard() {
  const users = useGameStore((s) => s.users);
  const tasks = useGameStore((s) => s.tasks);
  const completions = useGameStore((s) => s.completions);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="glow-text text-xl font-black text-neon">DASHBOARD</h1>
      {users.map((user) => (
        <PlayerCard key={user.id} user={user} tasks={tasks} completions={completions} />
      ))}
    </div>
  );
}
