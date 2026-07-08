import type {
  Achievement,
  PlayerId,
  Task,
  TaskCompletion,
  User,
  XpHistoryEntry,
} from '../../types';

// UI code only ever talks to this interface. Swapping LocalRepository for a
// SupabaseRepository later (see README) requires no changes outside lib/repository.
export interface GameRepository {
  getUsers(): Promise<User[]>;
  getUser(id: PlayerId): Promise<User | undefined>;
  addXp(userId: PlayerId, amount: number, reason: string): Promise<User>;

  getTasks(ownerId?: PlayerId): Promise<Task[]>;
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(id: string, patch: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  getCompletionsForDate(date: string): Promise<TaskCompletion[]>;
  completeTask(taskId: string, userId: PlayerId, status: 'done' | 'miss', date: string): Promise<TaskCompletion>;

  getXpHistory(userId: PlayerId): Promise<XpHistoryEntry[]>;
  getAchievements(userId: PlayerId): Promise<Achievement[]>;
  unlockAchievement(userId: PlayerId, name: string): Promise<Achievement>;

  getLeaderboard(range: 'daily' | 'weekly' | 'monthly'): Promise<{ userId: PlayerId; username: string; xp: number }[]>;
}
