import { Avatar } from './Avatar';
import { XpBar } from './XpBar';
import { titleForLevel, xpProgress } from '../lib/leveling';
import type { Task, TaskCompletion, User } from '../types';

interface Props {
  user: User;
  tasks: Task[];
  completions: TaskCompletion[];
}

export function PlayerCard({ user, tasks, completions }: Props) {
  const { level } = xpProgress(user.xp);
  const todaysTasks = tasks.filter((t) => t.ownerId === user.id && t.active);

  return (
    <div className="glow rounded-2xl border border-panel-border bg-panel p-4">
      <div className="flex items-center gap-3">
        <Avatar avatar={user.avatar} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              {user.id === 'mohanad' ? '⚔️' : '🛡️'} {user.username}
            </span>
          </div>
          <div className="text-xs text-neutral-400">
            Level {level} · {titleForLevel(level)}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <XpBar xp={user.xp} />
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
          Today's Quests
        </div>
        <ul className="space-y-1">
          {todaysTasks.map((task) => {
            const completion = completions.find((c) => c.taskId === task.id);
            return (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <span>{completion?.status === 'done' ? '✅' : '⬜'}</span>
                <span
                  className={completion?.status === 'miss' ? 'text-miss line-through' : ''}
                >
                  {task.icon} {task.name}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
