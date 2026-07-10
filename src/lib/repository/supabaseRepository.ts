// SupabaseRepository — the production backend. To activate:
//   1. npm install @supabase/supabase-js
//   2. Fill .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
//   3. In lib/repository/index.ts, export supabaseRepository instead of localRepository
//
// It implements the exact same GameRepository interface as localRepository, so
// no page/component/store changes are needed to switch backends.
//
// The import below is left as a dynamic requirement note rather than a hard
// import so the app still builds before @supabase/supabase-js is installed.
// Uncomment the real client wiring once the dependency is present.

import type { GameRepository } from './types';
import { levelFromXp, titleForLevel } from '../leveling';
import { supabase } from '../supabaseClient';

const today = () => new Date().toISOString().slice(0, 10);

// Auth-specific lookup: maps the logged-in Supabase Auth session to the
// matching player row. Not part of GameRepository — that interface is
// game-data only, this is identity resolution.
export async function getUserByAuthId(authUserId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw error;
  return data ? mapUser(data) : undefined;
}

export const supabaseRepository: GameRepository = {
  async getUsers() {
    const { data, error } = await supabase.from('users').select('*').order('created_at');
    if (error) throw error;
    return data.map(mapUser);
  },

  async getUser(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    return data ? mapUser(data) : undefined;
  },

  async addXp(userId, amount, reason) {
    const { data: current } = await supabase.from('users').select('xp').eq('id', userId).single();
    const newXp = Math.max(0, (current?.xp ?? 0) + amount);
    const level = levelFromXp(newXp);
    const { data, error } = await supabase
      .from('users')
      .update({ xp: newXp, level, title: titleForLevel(level) })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    await supabase.from('xp_history').insert({ user_id: userId, amount, reason });
    return mapUser(data);
  },

  async getTasks(ownerId) {
    let q = supabase.from('tasks').select('*');
    if (ownerId) q = q.eq('owner_id', ownerId);
    const { data, error } = await q;
    if (error) throw error;
    return data.map(mapTask);
  },

  async createTask(task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        owner_id: task.ownerId, name: task.name, category: task.category,
        icon: task.icon, xp_reward: task.xpReward, active: task.active,
      })
      .select().single();
    if (error) throw error;
    return mapTask(data);
  },

  async updateTask(id, patch) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.icon !== undefined) dbPatch.icon = patch.icon;
    if (patch.xpReward !== undefined) dbPatch.xp_reward = patch.xpReward;
    if (patch.active !== undefined) dbPatch.active = patch.active;
    const { data, error } = await supabase.from('tasks').update(dbPatch).eq('id', id).select().single();
    if (error) throw error;
    return mapTask(data);
  },

  async deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },

  async getCompletionsForDate(date) {
    const { data, error } = await supabase.from('task_completions').select('*').eq('date', date);
    if (error) throw error;
    return data.map(mapCompletion);
  },

  async getCompletionsInRange(userId, from, to) {
    const { data, error } = await supabase
      .from('task_completions').select('*')
      .eq('user_id', userId).gte('date', from).lte('date', to)
      .order('date');
    if (error) throw error;
    return data.map(mapCompletion);
  },

  async completeTask(taskId, userId, status, date = today()) {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    const xpEarned = status === 'done' ? task.xp_reward : 0;
    const { data, error } = await supabase
      .from('task_completions')
      .upsert({ task_id: taskId, user_id: userId, date, status, xp_earned: xpEarned },
              { onConflict: 'task_id,date' })
      .select().single();
    if (error) throw error;
    if (status === 'done') await this.addXp(userId, xpEarned, `Completed "${task.name}"`);
    return mapCompletion(data);
  },

  async getXpHistory(userId) {
    const { data, error } = await supabase
      .from('xp_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapXp);
  },

  async getAchievements(userId) {
    const { data, error } = await supabase.from('achievements').select('*').eq('user_id', userId);
    if (error) throw error;
    return data.map(mapAch);
  },

  async unlockAchievement(userId, name) {
    const { data, error } = await supabase
      .from('achievements').upsert({ user_id: userId, name }, { onConflict: 'user_id,name' })
      .select().single();
    if (error) throw error;
    return mapAch(data);
  },

  async getLeaderboard(range) {
    const since = range === 'season'
      ? await seasonStart()
      : range === 'all-time'
        ? new Date(0).toISOString()
        : startOfRange(range);
    const { data: users } = await supabase.from('users').select('id, username');
    const { data: history } = await supabase
      .from('xp_history').select('user_id, amount').gte('created_at', since);
    const totals = new Map<string, number>();
    (history ?? []).forEach((h) => totals.set(h.user_id, (totals.get(h.user_id) ?? 0) + h.amount));
    return (users ?? [])
      .map((u) => ({ userId: u.id, username: u.username, xp: totals.get(u.id) ?? 0 }))
      .sort((a, b) => b.xp - a.xp);
  },

  async getActiveSeason() {
    const { data, error } = await supabase
      .from('seasons').select('*').eq('is_active', true).order('number', { ascending: false }).maybeSingle();
    if (error) throw error;
    return data ? mapSeason(data) : null;
  },

  async getDailyWinner(date) {
    const { data, error } = await supabase
      .from('daily_winners').select('date, user_id, xp').eq('date', date).maybeSingle();
    if (error) throw error;
    if (!data) return { date, userId: null, username: null, xp: 0 };
    const { data: user } = await supabase.from('users').select('username').eq('id', data.user_id).maybeSingle();
    return { date, userId: data.user_id as any, username: user?.username ?? null, xp: data.xp };
  },

  async awardDailyWinner(date) {
    const { data, error } = await supabase.rpc('award_daily_winner', { p_date: date });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.winner_id) return { date, userId: null, username: null, xp: 0 };
    const { data: user } = await supabase.from('users').select('username').eq('id', row.winner_id).maybeSingle();
    return { date, userId: row.winner_id as any, username: user?.username ?? null, xp: row.winner_xp };
  },
};

async function seasonStart() {
  const { data } = await supabase.from('seasons').select('start_date').eq('is_active', true)
    .order('number', { ascending: false }).maybeSingle();
  return data ? `${data.start_date}T00:00:00.000Z` : new Date(0).toISOString();
}

function startOfRange(range: 'daily' | 'weekly' | 'monthly') {
  const now = new Date();
  if (range === 'daily') now.setHours(0, 0, 0, 0);
  else if (range === 'weekly') { const d = (now.getDay() + 6) % 7; now.setDate(now.getDate() - d); now.setHours(0,0,0,0); }
  else { now.setDate(1); now.setHours(0, 0, 0, 0); }
  return now.toISOString();
}

const mapUser = (r: any) => ({
  id: r.id, username: r.username, avatar: r.avatar, title: r.title, level: r.level, xp: r.xp,
  createdAt: r.created_at, authUserId: r.auth_user_id ?? undefined,
  currentStreak: r.current_streak ?? 0, longestStreak: r.longest_streak ?? 0,
});
const mapSeason = (r: any) => ({
  id: r.id, number: r.number, name: r.name, startDate: r.start_date, endDate: r.end_date,
  isActive: r.is_active, championId: r.champion_id ?? null, finalizedAt: r.finalized_at ?? null,
});
const mapTask = (r: any) => ({ id: r.id, ownerId: r.owner_id, name: r.name, category: r.category, icon: r.icon, xpReward: r.xp_reward, active: r.active });
const mapCompletion = (r: any) => ({ id: r.id, taskId: r.task_id, userId: r.user_id, date: r.date, status: r.status, xpEarned: r.xp_earned });
const mapXp = (r: any) => ({ id: r.id, userId: r.user_id, amount: r.amount, reason: r.reason, createdAt: r.created_at });
const mapAch = (r: any) => ({ id: r.id, userId: r.user_id, name: r.name, unlockedAt: r.unlocked_at });




