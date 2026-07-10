import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { titleForLevel, xpProgress } from '../lib/leveling';
import { Avatar, getEvolutionStage, getEvolvedAvatar } from './Avatar';

// Generate random particles for the cinematic effect
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1,
    size: 4 + Math.random() * 8,
  }));
}

// Stage-specific colors for the glow effects
const STAGE_THEME = {
  novice: { primary: '#ff7a1a', secondary: '#ff9a4a' },
  adventurer: { primary: '#22c55e', secondary: '#4ade80' },
  veteran: { primary: '#3b82f6', secondary: '#60a5fa' },
  champion: { primary: '#a855f7', secondary: '#c084fc' },
  legend: { primary: '#facc15', secondary: '#fde047' },
};

export function LevelUpModal() {
  const levelUpFor = useGameStore((s) => s.levelUpFor);
  const users = useGameStore((s) => s.users);
  const dismiss = useGameStore((s) => s.dismissLevelUp);

  const user = users.find((u) => u.id === levelUpFor);
  const level = user ? xpProgress(user.xp).level : 0;
  const stage = getEvolutionStage(level);
  const prevStage = getEvolutionStage(level - 1);
  const evolved = stage !== prevStage && level > 1;
  const theme = STAGE_THEME[stage];

  const particles = useMemo(() => generateParticles(20), [levelUpFor]);

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          {/* Dark overlay with radial gradient */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${theme.primary}15 0%, black 70%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Rising particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${p.x}%`,
                bottom: -20,
                width: p.size,
                height: p.size,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                boxShadow: `0 0 ${p.size}px ${theme.primary}`,
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: -window.innerHeight - 100,
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Screen flash on appear */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Main modal card */}
          <motion.div
            className="relative z-10 rounded-2xl border-2 bg-panel p-8 text-center"
            style={{
              borderColor: theme.primary,
              boxShadow: `0 0 40px ${theme.primary}66, 0 0 80px ${theme.primary}33`,
            }}
            initial={{ scale: 0.3, rotate: -15, opacity: 0, y: 50 }}
            animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pulsing ring behind avatar */}
            <motion.div
              className="absolute left-1/2 top-8 h-28 w-28 -translate-x-1/2 rounded-full"
              style={{ border: `2px solid ${theme.primary}44` }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />

            {/* Avatar with evolution */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              <Avatar avatar={user.avatar} level={level} size={100} />
            </motion.div>

            {/* LEVEL UP text with glow */}
            <motion.div
              className="mt-4 text-4xl font-black"
              style={{
                color: theme.primary,
                textShadow: `0 0 20px ${theme.primary}, 0 0 40px ${theme.primary}88`,
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.1, 1], opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              LEVEL UP!
            </motion.div>

            {/* Username */}
            <motion.div
              className="mt-2 text-xl font-bold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {user.username}
            </motion.div>

            {/* Level number with dramatic reveal */}
            <motion.div
              className="mt-2 text-5xl font-black"
              style={{ color: theme.primary }}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
            >
              {level}
            </motion.div>

            {/* Title */}
            <motion.div
              className="mt-1 text-sm uppercase tracking-widest text-neutral-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {titleForLevel(level)}
            </motion.div>

            {/* Evolution notice */}
            {evolved && (
              <motion.div
                className="mt-3 rounded-full px-4 py-1 text-sm font-bold"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}33, ${theme.secondary}33)`,
                  color: theme.primary,
                  border: `1px solid ${theme.primary}66`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
              >
                ✨ EVOLVED! {getEvolvedAvatar(user.avatar, level)}
              </motion.div>
            )}

            {/* Continue button */}
            <motion.button
              className="mt-6 rounded-full px-8 py-2.5 font-bold text-black"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                boxShadow: `0 0 20px ${theme.primary}66`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={dismiss}
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
