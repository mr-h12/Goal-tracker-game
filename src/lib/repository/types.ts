import type {
  Achievement,
  DailyWinner,
  PlayerId,
  Season,
  Task,
  TaskCompletion,
  User,
  XpHistoryEntry,
} from '../../types';

export type LeaderboardRange = 'daily' | 'weekly' | 'monthly' | 'season' | 'all-time';

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
  // Completions for a user between two YYYY-MM-DD dates (inclusive). Powers the
  // statistics page + habit heatmap.
  getCompletionsInRange(userId: PlayerId, from: string, to: string): Promise<TaskCompletion[]>;
  completeTask(taskId: string, userId: PlayerId, status: 'done' | 'miss', date: string): Promise<TaskCompletion>;

  getXpHistory(userId: PlayerId): Promise<XpHistoryEntry[]>;
  getAchievements(userId: PlayerId): Promise<Achievement[]>;
  unlockAchievement(userId: PlayerId, name: string): Promise<Achievement>;

  getLeaderboard(range: LeaderboardRange): Promise<{ userId: PlayerId; username: string; xp: number }[]>;

  getActiveSeason(): Promise<Season | null>;
  getDailyWinner(date: string): Promise<DailyWinner>;
  // Atomically records + awards the daily-winner bonus for `date` (idempotent).
  awardDailyWinner(date: string): Promise<DailyWinner>;
}
