import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { repository } from '../lib/repository';
import { getUserByAuthId } from '../lib/repository/supabaseRepository';
import { supabase } from '../lib/supabaseClient';
import { titleForLevel } from '../lib/leveling';
import { notifications, getNotificationPermission } from '../lib/notifications';
import { getEvolutionStage, getEvolvedAvatar } from '../components/Avatar';
import type { DailyWinner, PlayerId, Season, Task, TaskCompletion, User } from '../types';

interface GameState {
  users: User[];
  tasks: Task[];
  completions: TaskCompletion[];
  currentPlayer: PlayerId | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  levelUpFor: PlayerId | null;
  season: Season | null;
  yesterdayWinner: DailyWinner | null;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  swipeTask: (taskId: string, userId: PlayerId, status: 'done' | 'miss') => Promise<void>;
  createTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  dismissLevelUp: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const yesterdayIso = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

async function resolveCurrentPlayer(session: Session | null): Promise<PlayerId | null> {
  if (!session) return null;
  const user = await getUserByAuthId(session.user.id);
  return (user?.id as PlayerId) ?? null;
}

async function loadGameData() {
  const [users, tasks, completions, season] = await Promise.all([
    repository.getUsers(),
    repository.getTasks(),
    repository.getCompletionsForDate(todayIso()),
    repository.getActiveSeason(),
  ]);
  return { users, tasks, completions, season };
}

// Awards yesterday's daily-winner bonus. Idempotency + the actual XP grant are
// handled atomically by the repository (Postgres RPC keyed on the date), so
// concurrent inits (e.g. React StrictMode) can't double-award.
async function awardDailyWinnerBonusIfNeeded(): Promise<DailyWinner | null> {
  return repository.awardDailyWinner(yesterdayIso());
}

export const useGameStore = create<GameState>((set, get) => ({
  users: [],
  tasks: [],
  completions: [],
  currentPlayer: null,
  session: null,
  loading: true,
  authError: null,
  levelUpFor: null,
  season: null,
  yesterdayWinner: null,

  init: async () => {
    set({ loading: true });

    const { data: { session } } = await supabase.auth.getSession();
    const currentPlayer = await resolveCurrentPlayer(session);
    if (session) {
      const { users, tasks, completions, season } = await loadGameData();
      set({ users, tasks, completions, season, session, currentPlayer, loading: false });
      awardDailyWinnerBonusIfNeeded().then(async (yesterdayWinner) => {
        const { users: refreshedUsers } = await loadGameData();
        set({ yesterdayWinner, users: refreshedUsers });

        // Send daily winner notification
        if (yesterdayWinner?.userId && yesterdayWinner.username && getNotificationPermission() === 'granted') {
          notifications.dailyWinner(yesterdayWinner.username, yesterdayWinner.xp);
        }
      });
    } else {
      set({ session, currentPlayer, loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextPlayer = await resolveCurrentPlayer(nextSession);
      if (nextSession) {
        const { users, tasks, completions, season } = await loadGameData();
        set({ users, tasks, completions, season, session: nextSession, currentPlayer: nextPlayer });
      } else {
        set({ users: [], tasks: [], completions: [], season: null, session: nextSession, currentPlayer: nextPlayer });
      }
    });
  },

  signIn: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ authError: error.message });
      return false;
    }
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ currentPlayer: null, session: null });
  },

  swipeTask: async (taskId, userId, status) => {
    const prevUser = get().users.find((u) => u.id === userId);
    const prevLevel = prevUser?.level ?? 1;
    const prevStage = getEvolutionStage(prevLevel);

    await repository.completeTask(taskId, userId, status, todayIso());
    const [users, completions] = await Promise.all([
      repository.getUsers(),
      repository.getCompletionsForDate(todayIso()),
    ]);

    const nextUser = users.find((u) => u.id === userId);
    const nextLevel = nextUser?.level ?? prevLevel;
    const nextStage = getEvolutionStage(nextLevel);

    // Send notifications if permission granted
    if (nextLevel > prevLevel && getNotificationPermission() === 'granted' && nextUser) {
      // Level up notification
      notifications.levelUp(nextUser.username, nextLevel, titleForLevel(nextLevel));

      // Evolution notification
      if (nextStage !== prevStage) {
        const newEmoji = getEvolvedAvatar(nextUser.avatar, nextLevel);
        notifications.evolution(nextUser.username, newEmoji);
      }
    }

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
