import type {
  Achievement,
  PlayerId,
  Season,
  Task,
  TaskCompletion,
  User,
  XpHistoryEntry,
} from '../../types';
import { levelFromXp, titleForLevel } from '../leveling';
import { SEED_USERS, seedTasks } from './seed';
import type { GameRepository, LeaderboardRange } from './types';

const STORAGE_KEY = 'quest-duo:v1';
const SEASON: Season = {
  id: 'season-1',
  number: 1,
  name: 'Season 1',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '2026-09-25',
  isActive: true,
  championId: null,
  finalizedAt: null,
};

interface DailyWinnerRow {
  date: string;
  userId: PlayerId;
  xp: number;
}

interface Db {
  users: User[];
  tasks: Task[];
  completions: TaskCompletion[];
  xpHistory: XpHistoryEntry[];
  achievements: Achievement[];
  dailyWinners?: DailyWinnerRow[];
}

function computeDayWinner(db: Db, date: string): { id: PlayerId; username: string; xp: number } | null {
  const totals = new Map<PlayerId, number>();
  for (const h of db.xpHistory) {
    if (h.createdAt.slice(0, 10) === date && h.amount > 0 && !h.reason.startsWith('Daily Winner Bonus')) {
      totals.set(h.userId, (totals.get(h.userId) ?? 0) + h.amount);
    }
  }
  let winner: { id: PlayerId; username: string; xp: number } | null = null;
  for (const u of db.users) {
    const xp = totals.get(u.id) ?? 0;
    if (xp > 0 && (!winner || xp > winner.xp)) winner = { id: u.id, username: u.username, xp };
  }
  return winner;
}

function recomputeStreak(db: Db, userId: PlayerId) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  const activeDays = [...new Set(
    db.completions.filter((c) => c.userId === userId && c.status === 'done').map((c) => c.date),
  )].sort();
  let run = 0;
  let best = 0;
  let prev: string | null = null;
  for (const d of activeDays) {
    const isConsecutive = prev !== null && new Date(d).getTime() - new Date(prev).getTime() === 86400000;
    run = isConsecutive ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const today = todayIso();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  user.currentStreak = prev === today || prev === yesterday ? run : 0;
  user.longestStreak = Math.max(user.longestStreak, best);
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

function startOfRange(range: LeaderboardRange): Date {
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
  if (range === 'all-time') return new Date(0);
  if (range === 'season') return new Date(SEASON.startDate);
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

  async getCompletionsInRange(userId, from, to) {
    return loadDb()
      .completions.filter((c) => c.userId === userId && c.date >= from && c.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
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
    recomputeStreak(db, userId);
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

  async getActiveSeason() {
    return SEASON;
  },

  async getDailyWinner(date) {
    const db = loadDb();
    const recorded = (db.dailyWinners ?? []).find((w) => w.date === date);
    if (recorded) {
      const u = db.users.find((x) => x.id === recorded.userId);
      return { date, userId: recorded.userId, username: u?.username ?? null, xp: recorded.xp };
    }
    const winner = computeDayWinner(db, date);
    return {
      date,
      userId: winner?.id ?? null,
      username: winner?.username ?? null,
      xp: winner?.xp ?? 0,
    };
  },

  async awardDailyWinner(date) {
    const db = loadDb();
    db.dailyWinners = db.dailyWinners ?? [];
    const existing = db.dailyWinners.find((w) => w.date === date);
    if (existing) {
      const u = db.users.find((x) => x.id === existing.userId);
      return { date, userId: existing.userId, username: u?.username ?? null, xp: existing.xp };
    }
    const winner = computeDayWinner(db, date);
    if (!winner) return { date, userId: null, username: null, xp: 0 };

    db.dailyWinners.push({ date, userId: winner.id, xp: winner.xp });
    saveDb(db);
    await localRepository.addXp(winner.id, 50, `Daily Winner Bonus (${date})`);
    await localRepository.unlockAchievement(winner.id, 'Daily Winner');
    return { date, userId: winner.id, username: winner.username, xp: winner.xp };
  },
};
