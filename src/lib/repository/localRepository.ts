import type {
  Achievement,
  PlayerId,
  Task,
  TaskCompletion,
  User,
  XpHistoryEntry,
} from '../../types';
import { levelFromXp, titleForLevel } from '../leveling';
import { SEED_USERS, seedTasks } from './seed';
import type { GameRepository } from './types';

const STORAGE_KEY = 'quest-duo:v1';

interface Db {
  users: User[];
  tasks: Task[];
  completions: TaskCompletion[];
  xpHistory: XpHistoryEntry[];
  achievements: Achievement[];
}

function loadDb(): Db {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw) as Db;
  const db: Db = {
    users: SEED_USERS,
    tasks: seedTasks(),
    completions: [],
    xpHistory: [],
    achievements: [],
  };
  saveDb(db);
  return db;
}

function saveDb(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfRange(range: 'daily' | 'weekly' | 'monthly'): Date {
  const now = new Date();
  if (range === 'daily') {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (range === 'weekly') {
    const day = now.getDay();
    const diff = (day + 6) % 7; // Monday start
    now.setDate(now.getDate() - diff);
    now.setHours(0, 0, 0, 0);
    return now;
  }
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now;
}

// LocalStorage-backed implementation of GameRepository. Same shape as a future
// SupabaseRepository so pages never need to change when the backend swaps in.
export const localRepository: GameRepository = {
  async getUsers() {
    return loadDb().users;
  },

  async getUser(id) {
    return loadDb().users.find((u) => u.id === id);
  },

  async addXp(userId, amount, reason) {
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error(`Unknown user ${userId}`);
    user.xp = Math.max(0, user.xp + amount);
    user.level = levelFromXp(user.xp);
    user.title = titleForLevel(user.level);
    db.xpHistory.push({
      id: uid(),
      userId,
      amount,
      reason,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    return user;
  },

  async getTasks(ownerId) {
    const db = loadDb();
    return ownerId ? db.tasks.filter((t) => t.ownerId === ownerId) : db.tasks;
  },

  async createTask(task) {
    const db = loadDb();
    const newTask: Task = { ...task, id: uid() };
    db.tasks.push(newTask);
    saveDb(db);
    return newTask;
  },

  async updateTask(id, patch) {
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Unknown task ${id}`);
    Object.assign(task, patch);
    saveDb(db);
    return task;
  },

  async deleteTask(id) {
    const db = loadDb();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    saveDb(db);
  },

  async getCompletionsForDate(date) {
    return loadDb().completions.filter((c) => c.date === date);
  },

  async completeTask(taskId, userId, status, date = todayIso()) {
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Unknown task ${taskId}`);

    const existing = db.completions.find(
      (c) => c.taskId === taskId && c.date === date,
    );
    const xpEarned = status === 'done' ? task.xpReward : 0;

    if (existing) {
      existing.status = status;
      existing.xpEarned = xpEarned;
    } else {
      db.completions.push({
        id: uid(),
        taskId,
        userId,
        date,
        status,
        xpEarned,
      });
    }
    saveDb(db);

    if (status === 'done') {
      await localRepository.addXp(userId, xpEarned, `Completed "${task.name}"`);
    }

    return db.completions.find((c) => c.taskId === taskId && c.date === date)!;
  },

  async getXpHistory(userId) {
    return loadDb()
      .xpHistory.filter((h) => h.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getAchievements(userId) {
    return loadDb().achievements.filter((a) => a.userId === userId);
  },

  async unlockAchievement(userId, name) {
    const db = loadDb();
    if (db.achievements.some((a) => a.userId === userId && a.name === name)) {
      return db.achievements.find((a) => a.userId === userId && a.name === name)!;
    }
    const achievement: Achievement = {
      id: uid(),
      userId,
      name,
      unlockedAt: new Date().toISOString(),
    };
    db.achievements.push(achievement);
    saveDb(db);
    return achievement;
  },

  async getLeaderboard(range) {
    const db = loadDb();
    const since = startOfRange(range).toISOString().slice(0, 10);
    const totals = new Map<PlayerId, number>();
    for (const user of db.users) totals.set(user.id, 0);
    for (const h of db.xpHistory) {
      if (h.createdAt.slice(0, 10) >= since) {
        totals.set(h.userId, (totals.get(h.userId) ?? 0) + h.amount);
      }
    }
    return db.users
      .map((u) => ({ userId: u.id, username: u.username, xp: totals.get(u.id) ?? 0 }))
      .sort((a, b) => b.xp - a.xp);
  },
};
