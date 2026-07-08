import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { titleForLevel, xpProgress } from '../lib/leveling';

export function LevelUpModal() {
  const levelUpFor = useGameStore((s) => s.levelUpFor);
  const users = useGameStore((s) => s.users);
  const dismiss = useGameStore((s) => s.dismissLevelUp);

  const user = users.find((u) => u.id === levelUpFor);
  const level = user ? xpProgress(user.xp).level : 0;

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="glow rounded-2xl border-2 border-neon bg-panel p-8 text-center"
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          >
            <div className="glow-text text-4xl font-black text-neon">LEVEL UP!</div>
            <div className="mt-2 text-xl">{user.username}</div>
            <div className="mt-1 text-3xl font-bold">Level {level}</div>
            <div className="mt-1 text-sm text-neutral-400">{titleForLevel(level)}</div>
            <button
              className="glow mt-6 rounded-full bg-neon px-6 py-2 font-bold text-black"
              onClick={dismiss}
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
