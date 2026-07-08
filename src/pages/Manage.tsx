import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { Task } from '../types';

const CATEGORIES = ['Faith', 'Health', 'Work', 'Life'];

export function Manage() {
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const tasks = useGameStore((s) => s.tasks);
  const createTask = useGameStore((s) => s.createTask);
  const updateTask = useGameStore((s) => s.updateTask);
  const deleteTask = useGameStore((s) => s.deleteTask);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [xpReward, setXpReward] = useState(20);

  if (!currentPlayer) return null;
  const myTasks = tasks.filter((t) => t.ownerId === currentPlayer);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !currentPlayer) return;
    await createTask({
      ownerId: currentPlayer,
      name: name.trim(),
      category,
      icon: '⭐',
      xpReward,
      active: true,
    });
    setName('');
    setXpReward(20);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="glow-text text-xl font-black text-neon">MANAGE QUESTS</h1>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-xl border border-panel-border bg-panel p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New quest name"
          className="rounded-lg border border-panel-border bg-bg px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 rounded-lg border border-panel-border bg-bg px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={xpReward}
            onChange={(e) => setXpReward(Number(e.target.value))}
            className="w-24 rounded-lg border border-panel-border bg-bg px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="glow rounded-lg bg-neon py-2 text-sm font-bold text-black">
          + Add Quest
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {myTasks.map((task) => (
          <TaskRow key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
        ))}
      </ul>
    </div>
  );
}

function TaskRow({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-panel-border bg-panel p-3">
      <span className="flex-1 text-sm">
        {task.icon} {task.name}
        <span className="ml-2 text-xs text-neutral-500">{task.category}</span>
      </span>
      <input
        type="number"
        value={task.xpReward}
        onChange={(e) => onUpdate(task.id, { xpReward: Number(e.target.value) })}
        className="w-16 rounded-lg border border-panel-border bg-bg px-2 py-1 text-right text-xs"
      />
      <button
        onClick={() => onUpdate(task.id, { active: !task.active })}
        className={`rounded-lg px-2 py-1 text-xs font-bold ${
          task.active ? 'text-done' : 'text-neutral-600'
        }`}
      >
        {task.active ? 'ON' : 'OFF'}
      </button>
      <button onClick={() => onDelete(task.id)} className="rounded-lg px-2 py-1 text-xs text-miss">
        ✕
      </button>
    </li>
  );
}
