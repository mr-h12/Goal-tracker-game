export type PlayerId = 'mohanad' | 'hasabo';

export interface User {
  id: PlayerId;
  username: string;
  avatar: 'wolf' | 'whale';
  title: string;
  level: number;
  xp: number;
  createdAt: string;
}

export interface Task {
  id: string;
  ownerId: PlayerId;
  name: string;
  category: string;
  icon: string;
  xpReward: number;
  active: boolean;
}

export type CompletionStatus = 'done' | 'miss';

export interface TaskCompletion {
  id: string;
  taskId: string;
  userId: PlayerId;
  date: string; // YYYY-MM-DD
  status: CompletionStatus;
  xpEarned: number;
}

export interface XpHistoryEntry {
  id: string;
  userId: PlayerId;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  userId: PlayerId;
  name: string;
  unlockedAt: string;
}

export interface LeaderboardEntry {
  userId: PlayerId;
  username: string;
  xp: number;
}
