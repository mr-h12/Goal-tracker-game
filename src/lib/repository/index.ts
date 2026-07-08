import { supabaseRepository } from './supabaseRepository';
import type { GameRepository } from './types';

export const repository: GameRepository = supabaseRepository;
export type { GameRepository };