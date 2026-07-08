import { useGameStore } from '../store/useGameStore';
import { QuestCard } from '../components/QuestCard';

export function Quests() {
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const tasks = useGameStore((s) => s.tasks);
  const completions = useGameStore((s) => s.completions);
  const swipeTask = useGameStore((s) => s.swipeTask);

  if (!currentPlayer) return null;

  const myTasks = tasks.filter((t) => t.ownerId === currentPlayer && t.active);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="glow-text text-xl font-black text-neon">MY QUESTS</h1>
      {myTasks.length === 0 && (
        <p className="text-sm text-neutral-500">No active quests. Add some in Manage.</p>
      )}
      {myTasks.map((task) => {
        const completion = completions.find((c) => c.taskId === task.id);
        return (
          <QuestCard
            key={task.id}
            task={task}
            status={completion?.status}
            onSwipe={(status) => swipeTask(task.id, currentPlayer, status)}
          />
        );
      })}
    </div>
  );
}
