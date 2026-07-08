import type { Task, User } from '../../types';

export const SEED_USERS: User[] = [
  {
    id: 'mohanad',
    username: 'MOHANAD',
    avatar: 'wolf',
    title: 'Novice',
    level: 1,
    xp: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hasabo',
    username: 'HASABO',
    avatar: 'whale',
    title: 'Novice',
    level: 1,
    xp: 0,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_TASKS: { name: string; category: string; icon: string; xpReward: number }[] = [
  { name: 'Prayer on time', category: 'Faith', icon: '🕌', xpReward: 20 },
  { name: 'Read Quran', category: 'Faith', icon: '📖', xpReward: 20 },
  { name: 'Cashier SaaS project', category: 'Work', icon: '💼', xpReward: 40 },
  { name: 'Gym', category: 'Health', icon: '🏋️', xpReward: 50 },
  { name: 'Social', category: 'Life', icon: '🎉', xpReward: 15 },
  { name: 'Graduation project', category: 'Work', icon: '🎓', xpReward: 40 },
];

export function seedTasks(): Task[] {
  const tasks: Task[] = [];
  for (const owner of SEED_USERS) {
    for (const t of DEFAULT_TASKS) {
      tasks.push({
        id: `${owner.id}-${t.name.toLowerCase().replace(/\s+/g, '-')}`,
        ownerId: owner.id,
        active: true,
        ...t,
      });
    }
  }
  return tasks;
}
