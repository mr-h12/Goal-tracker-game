import { create } from 'zustand';
import { repository } from '../lib/repository';
import type { PlayerId, Task, TaskCompletion, User } from '../types';

interface GameState {
  users: User[];
  tasks: Task[];
  completions: TaskCompletion[];
  currentPlayer: PlayerId | null;
  loading: boolean;
  levelUpFor: PlayerId | null;

  init: () => Promise<void>;
  selectPlayer: (id: PlayerId) => void;
  logout: () => void;
  swipeTask: (taskId: string, userId: PlayerId, status: 'done' | 'miss') => Promise<void>;
  createTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  dismissLevelUp: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const useGameStore = create<GameState>((set, get) => ({
  users: [],
  tasks: [],
  completions: [],
  currentPlayer: (localStorage.getItem('quest-duo:current-player') as PlayerId | null) ?? null,
  loading: true,
  levelUpFor: null,

  init: async () => {
    set({ loading: true });
    const [users, tasks, completions] = await Promise.all([
      repository.getUsers(),
      repository.getTasks(),
      repository.getCompletionsForDate(todayIso()),
    ]);
    set({ users, tasks, completions, loading: false });
  },

  selectPlayer: (id) => {
    localStorage.setItem('quest-duo:current-player', id);
    set({ currentPlayer: id });
  },

  logout: () => {
    localStorage.removeItem('quest-duo:current-player');
    set({ currentPlayer: null });
  },

  swipeTask: async (taskId, userId, status) => {
    const prevLevel = get().users.find((u) => u.id === userId)?.level ?? 1;
    await repository.completeTask(taskId, userId, status, todayIso());
    const [users, completions] = await Promise.all([
      repository.getUsers(),
      repository.getCompletionsForDate(todayIso()),
    ]);
    const nextLevel = users.find((u) => u.id === userId)?.level ?? prevLevel;
    set({ users, completions, levelUpFor: nextLevel > prevLevel ? userId : get().levelUpFor });
  },

  createTask: async (task) => {
    await repository.createTask(task);
    set({ tasks: await repository.getTasks() });
  },

  updateTask: async (id, patch) => {
    await repository.updateTask(id, patch);
    set({ tasks: await repository.getTasks() });
  },

  deleteTask: async (id) => {
    await repository.deleteTask(id);
    set({ tasks: await repository.getTasks() });
  },

  dismissLevelUp: () => set({ levelUpFor: null }),
}));
