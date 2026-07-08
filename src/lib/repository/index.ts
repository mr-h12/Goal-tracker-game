import { localRepository } from './localRepository';
import type { GameRepository } from './types';

// Swap this line for a SupabaseRepository once a Supabase project exists.
export const repository: GameRepository = localRepository;
export type { GameRepository };
