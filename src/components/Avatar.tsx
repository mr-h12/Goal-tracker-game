import { motion } from 'framer-motion';

// Avatar evolution stages based on title/level tier
type EvolutionStage = 'novice' | 'adventurer' | 'veteran' | 'champion' | 'legend';

// Wolf evolution: 🐺 → 🐕 → 🦊 → 🐅 → 🦁
// Whale evolution: 🐋 → 🐬 → 🦈 → 🐉 → 🐲
const AVATAR_EVOLUTION: Record<string, Record<EvolutionStage, string>> = {
  wolf: {
    novice: '🐺',
    adventurer: '🦊',
    veteran: '🐅',
    champion: '🦁',
    legend: '🐉',
  },
  whale: {
    novice: '🐋',
    adventurer: '🐬',
    veteran: '🦈',
    champion: '🐙',
    legend: '🐲',
  },
};

// Border colors for each evolution stage
const STAGE_COLORS: Record<EvolutionStage, string> = {
  novice: '#ff7a1a',      // neon orange
  adventurer: '#22c55e',  // green
  veteran: '#3b82f6',     // blue
  champion: '#a855f7',    // purple
  legend: '#facc15',      // gold
};

const STAGE_GLOW: Record<EvolutionStage, string> = {
  novice: '0 0 10px #ff7a1a55',
  adventurer: '0 0 12px #22c55e66',
  veteran: '0 0 14px #3b82f677',
  champion: '0 0 16px #a855f788',
  legend: '0 0 20px #facc15aa, 0 0 40px #facc1544',
};

export function getEvolutionStage(level: number): EvolutionStage {
  if (level >= 20) return 'legend';
  if (level >= 15) return 'champion';
  if (level >= 10) return 'veteran';
  if (level >= 5) return 'adventurer';
  return 'novice';
}

export function getEvolvedAvatar(avatar: string, level: number): string {
  const stage = getEvolutionStage(level);
  return AVATAR_EVOLUTION[avatar]?.[stage] ?? AVATAR_EVOLUTION[avatar]?.novice ?? '❓';
}

interface AvatarProps {
  avatar: string;
  level?: number;
  size?: number;
  animate?: boolean;
}

export function Avatar({ avatar, level = 1, size = 56, animate = true }: AvatarProps) {
  const stage = getEvolutionStage(level);
  const emoji = getEvolvedAvatar(avatar, level);
  const borderColor = STAGE_COLORS[stage];
  const glow = STAGE_GLOW[stage];

  const isLegend = stage === 'legend';

  return (
    <motion.div
      className="relative flex items-center justify-center rounded-full bg-panel"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        border: `2px solid ${borderColor}`,
        boxShadow: glow,
      }}
      animate={
        animate && isLegend
          ? {
              boxShadow: [
                '0 0 20px #facc15aa, 0 0 40px #facc1544',
                '0 0 30px #facc15cc, 0 0 60px #facc1566',
                '0 0 20px #facc15aa, 0 0 40px #facc1544',
              ],
            }
          : undefined
      }
      transition={isLegend ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <span className="select-none">{emoji}</span>
      {isLegend && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: '1px solid #facc1544' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </motion.div>
  );
}
